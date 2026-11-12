/**
 * Sistema XP e livellamento per il bot Discord (Multi-Server)
 *
 * Gestisce l'assegnazione di XP agli utenti per messaggi e attività vocale,
 * calcola i livelli e notifica gli utenti quando raggiungono nuovi livelli.
 *
 * Supporta l'isolamento per server (guildId) e la persistenza diretta su MongoDB Cloud.
 */

const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/guildSettings');
const { isDBConnected } = require('./database');
const defaultConfig = require('../config/config');
const UserXPModel = require('../models/UserXP');
const GuildActivityModel = require('../models/GuildActivity');

// ─────────────────────────────────────────────────────────────────────────────
// Cache XP in memoria per-server: xpCache[guildId][userId] = { xp, level, username }
// ─────────────────────────────────────────────────────────────────────────────
const xpCache = {};
const loadedGuilds = new Set();
const dirtyUsers = new Set(); // Traccia solo "guildId:userId" modificati per ottimizzare bulkWrite
let cacheDirty = false;
let flushLock = false;

// ─────────────────────────────────────────────────────────────────────────────
// Buffer Attività Giornaliera (IDEA-004 Analytics): dailyActivityCache[guildId] = { date, messages, voiceMinutes, xpGained, activeUsers }
// ─────────────────────────────────────────────────────────────────────────────
const dailyActivityCache = new Map();

function getTodayString() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

/**
 * Registra attività per le analytics giornaliere del server
 */
function recordActivity(guildId, { messages = 0, voiceMinutes = 0, xpGained = 0, userId = null } = {}) {
  if (!guildId) return;
  const today = getTodayString();
  let entry = dailyActivityCache.get(guildId);

  if (!entry || entry.date !== today) {
    entry = { date: today, messages: 0, voiceMinutes: 0, xpGained: 0, activeUsers: new Set() };
    dailyActivityCache.set(guildId, entry);
  }

  entry.messages += messages;
  entry.voiceMinutes += voiceMinutes;
  entry.xpGained += xpGained;
  if (userId) entry.activeUsers.add(userId);
}

/**
 * Assicura che i dati XP di uno specifico server siano caricati in memoria
 * @param {string} guildId
 * @returns {Promise<Object>} Mappa degli utenti per quel server
 */
async function ensureGuildCache(guildId) {
  if (!guildId) return {};
  if (!xpCache[guildId]) xpCache[guildId] = {};

  if (!loadedGuilds.has(guildId)) {
    if (isDBConnected() && UserXPModel) {
      try {
        const users = await UserXPModel.find({ guildId }).lean();
        users.forEach(u => {
          xpCache[guildId][u.userId] = {
            xp: u.xp || 0,
            level: u.level || 0,
            username: u.username || 'Unknown'
          };
        });
      } catch (err) {
        console.error(`❌ Errore caricamento XP da MongoDB per [${guildId}]:`, err.message);
      }
    }
    loadedGuilds.add(guildId);
  }

  return xpCache[guildId];
}

/**
 * Segna un utente come modificato nella cache
 * @param {string} guildId
 * @param {string} userId
 */
function markUserDirty(guildId, userId) {
  if (!guildId || !userId) return;
  dirtyUsers.add(`${guildId}:${userId}`);
  cacheDirty = true;
}

/**
 * Scrive le modifiche dalla cache in memoria su MongoDB salvando SOLO gli utenti modificati
 * e sincronizza le statistiche aggregate di attività giornaliera (IDEA-004)
 */
async function flushCache() {
  const hasDirtyUsers = cacheDirty && dirtyUsers.size > 0;
  const hasDailyActivity = dailyActivityCache.size > 0;

  if ((!hasDirtyUsers && !hasDailyActivity) || flushLock) return;
  flushLock = true;

  try {
    if (isDBConnected()) {
      // 1. Flush UserXP
      if (hasDirtyUsers && UserXPModel) {
        const operations = [];
        const keysToFlush = Array.from(dirtyUsers);

        for (const key of keysToFlush) {
          const [gId, uId] = key.split(':');
          const userData = xpCache[gId]?.[uId];
          if (!userData) continue;

          operations.push({
            updateOne: {
              filter: { guildId: gId, userId: uId },
              update: {
                $set: {
                  username: userData.username || 'Unknown',
                  xp: userData.xp,
                  level: userData.level
                }
              },
              upsert: true
            }
          });
        }

        if (operations.length > 0) {
          await UserXPModel.bulkWrite(operations);
        }

        // Rimuove solo le chiavi scritte con successo
        keysToFlush.forEach(k => dirtyUsers.delete(k));
        if (dirtyUsers.size === 0) {
          cacheDirty = false;
        }
      }

      // 2. Flush GuildActivity (IDEA-004)
      if (hasDailyActivity && GuildActivityModel) {
        const activityOps = [];
        for (const [gId, act] of dailyActivityCache.entries()) {
          if (act.messages === 0 && act.voiceMinutes === 0 && act.xpGained === 0) continue;
          activityOps.push({
            updateOne: {
              filter: { guildId: gId, date: act.date },
              update: {
                $inc: {
                  messages: act.messages,
                  voiceMinutes: act.voiceMinutes,
                  xpGained: act.xpGained
                },
                $addToSet: {
                  activeUsers: { $each: Array.from(act.activeUsers) }
                }
              },
              upsert: true
            }
          });
        }

        if (activityOps.length > 0) {
          await GuildActivityModel.bulkWrite(activityOps);
        }
        dailyActivityCache.clear();
      }
    }
  } catch (error) {
    console.error('❌ Errore flush cache XP / Analytics su MongoDB:', error.message);
  } finally {
    flushLock = false;
  }
}

/**
 * Escapa i caratteri markdown di Discord in una stringa
 */
function escapeMarkdown(text) {
  return text ? text.replace(/([_*~`|\\])/g, '\\$1') : '';
}

/**
 * Invia l'embed di notifica level-up se abilitato nella configurazione del server
 */
function sendLevelUpNotification(guild, guildConfig, userId, username, newLevel, totalXp) {
  // Verifica se le notifiche sono abilitate (default: true)
  const isNotificationEnabled = guildConfig.features?.levelUpNotificationEnabled !== false;
  const levelUpChannelId = guildConfig.levelUpChannelId;

  if (!isNotificationEnabled || !levelUpChannelId) return;

  const channel = guild.channels.cache.get(levelUpChannelId);
  if (!channel) return;

  const cleanName = escapeMarkdown(username);
  const templateText = guildConfig.levelUpMessageText || defaultConfig.levelUpMessageText;
  const formattedDesc = templateText
    .replace(/{user}/g, cleanName)
    .replace(/{mention}/g, `<@${userId}>`)
    .replace(/{level}/g, String(newLevel))
    .replace(/{server}/g, guild.name)
    .replace(/{xp}/g, String(totalXp));

  const levelUpEmbed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('🎉 Level Up!')
    .setDescription(formattedDesc)
    .setFooter({ text: `XP totali: ${totalXp}` });

  channel.send({ embeds: [levelUpEmbed] }).catch(err =>
    console.error(`❌ Impossibile inviare notifica level-up in [${levelUpChannelId}]:`, err.message)
  );
}

/**
 * Calcola il livello in base ai punti XP
 * Formula: level = floor(0.1 * sqrt(xp))
 */
function getLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

/**
 * Calcola gli XP necessari per raggiungere il prossimo livello
 */
function getNextLevelXP(xp) {
  const nextLevel = getLevel(xp) + 1;
  return Math.pow(nextLevel / 0.1, 2);
}

/**
 * Carica i dati XP per una gilda
 */
async function loadXPData(guildId) {
  if (guildId) return await ensureGuildCache(guildId);
  return xpCache;
}

/**
 * Aggiunge XP a un utente e gestisce il level-up
 */
async function addXP(client, userID, xpAmount, guild, username = 'Utente') {
  if (!guild) return;
  const guildId = guild.id;
  const guildConfig = await getGuildConfig(guildId);

  if (guildConfig.features && guildConfig.features.xpEnabled === false) {
    return;
  }

  const cache = await ensureGuildCache(guildId);
  if (!cache[userID]) cache[userID] = { xp: 0, level: 0, username };

  const oldLevel = getLevel(cache[userID].xp);
  cache[userID].xp += xpAmount;
  cache[userID].username = username;
  const newLevel = getLevel(cache[userID].xp);

  if (newLevel > oldLevel) {
    cache[userID].level = newLevel;
    sendLevelUpNotification(guild, guildConfig, userID, username, newLevel, cache[userID].xp);
  }

  dirtyUsers.add(`${guildId}:${userID}`);
  cacheDirty = true;
}

// Map di cooldown per messaggi: `${guildId}:${userId}` -> timestamp (IDEA-002)
const messageXpCooldowns = new Map();
const MESSAGE_XP_COOLDOWN_MS = 60 * 1000; // 60 secondi

/**
 * Gestisce l'assegnazione di XP quando un utente invia un messaggio con cooldown anti-spam (IDEA-002)
 */
async function handleXP(client, message) {
  if (!message.guild || message.author.bot) return;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const lastXpTime = messageXpCooldowns.get(key);

  if (lastXpTime && now - lastXpTime < MESSAGE_XP_COOLDOWN_MS) {
    return; // Ignora se l'utente ha già guadagnato XP negli ultimi 60 secondi
  }

  messageXpCooldowns.set(key, now);

  // Pulizia periodica preventiva della Map per evitare accumulo indefinito di memoria
  if (messageXpCooldowns.size > 10000) {
    for (const [k, timestamp] of messageXpCooldowns.entries()) {
      if (now - timestamp > MESSAGE_XP_COOLDOWN_MS) {
        messageXpCooldowns.delete(k);
      }
    }
  }

  // Traccia attività giornaliera server (IDEA-004)
  recordActivity(message.guild.id, { messages: 1, xpGained: 10, userId: message.author.id });

  await addXP(client, message.author.id, 10, message.guild, message.author.username);
}

/**
 * Gestisce l'assegnazione di XP agli utenti nei canali vocali (per tutti i server)
 */
async function handleVoiceXP(client) {
  if (!client || !client.guilds) return;

  for (const guild of client.guilds.cache.values()) {
    const guildConfig = await getGuildConfig(guild.id);
    if (guildConfig.features && guildConfig.features.xpEnabled === false) continue;

    const cache = await ensureGuildCache(guild.id);

    guild.members.cache.forEach(member => {
      if (!member.user.bot && member.voice.channel) {
        const uId = member.id;
        if (!cache[uId]) cache[uId] = { xp: 0, level: 0, username: member.user.username };

        const oldLevel = getLevel(cache[uId].xp);
        cache[uId].xp += 5;
        cache[uId].username = member.user.username;
        const newLevel = getLevel(cache[uId].xp);

        if (newLevel > oldLevel) {
          cache[uId].level = newLevel;
          sendLevelUpNotification(guild, guildConfig, uId, member.user.username, newLevel, cache[uId].xp);
        }

        dirtyUsers.add(`${guild.id}:${uId}`);
        cacheDirty = true;

        // Traccia attività vocale giornaliera (IDEA-004: 30 secondi = 0.5 minuti)
        recordActivity(guild.id, { voiceMinutes: 0.5, xpGained: 5, userId: uId });
      }
    });
  }
}

module.exports = {
  handleXP,
  handleVoiceXP,
  loadXPData,
  flushCache,
  markUserDirty,
  getLevel,
  getNextLevelXP,
  addXP,
  recordActivity,
};
