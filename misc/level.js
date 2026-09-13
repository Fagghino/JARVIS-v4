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
const UserXPModel = require('../models/UserXP');

// ─────────────────────────────────────────────────────────────────────────────
// Cache XP in memoria per-server: xpCache[guildId][userId] = { xp, level, username }
// ─────────────────────────────────────────────────────────────────────────────
const xpCache = {};
const loadedGuilds = new Set();
let cacheDirty = false;
let flushLock = false;

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
 * Scrive le modifiche dalla cache in memoria su MongoDB
 */
async function flushCache() {
  if (!cacheDirty || flushLock) return;
  flushLock = true;

  try {
    if (isDBConnected() && UserXPModel) {
      const operations = [];

      for (const gId of Object.keys(xpCache)) {
        for (const uId of Object.keys(xpCache[gId])) {
          const userData = xpCache[gId][uId];
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
      }

      if (operations.length > 0) {
        await UserXPModel.bulkWrite(operations);
      }
      cacheDirty = false;
    }
  } catch (error) {
    console.error('❌ Errore flush cache XP su MongoDB:', error.message);
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

    const levelUpChannelId = guildConfig.levelUpChannelId;
    if (levelUpChannelId) {
      const channel = guild.channels.cache.get(levelUpChannelId);
      if (channel) {
        const cleanName = escapeMarkdown(username);
        const levelUpEmbed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('🎉 Level Up!')
          .setDescription(`Congratulazioni **${cleanName}**! Hai raggiunto il **livello ${newLevel}**!`)
          .setFooter({ text: `XP totali: ${cache[userID].xp}` });

        channel.send({ embeds: [levelUpEmbed] }).catch(err =>
          console.error(`❌ Impossibile inviare notifica level-up in [${levelUpChannelId}]:`, err.message)
        );
      }
    }
  }

  cacheDirty = true;
}

/**
 * Gestisce l'assegnazione di XP quando un utente invia un messaggio
 */
async function handleXP(client, message) {
  if (!message.guild || message.author.bot) return;
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
          const levelUpChannelId = guildConfig.levelUpChannelId;
          if (levelUpChannelId) {
            const channel = guild.channels.cache.get(levelUpChannelId);
            if (channel) {
              const levelUpEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('🎉 Level Up!')
                .setDescription(`Congratulazioni **${escapeMarkdown(member.user.username)}**! Hai raggiunto il **livello ${newLevel}**!`)
                .setFooter({ text: `XP totali: ${cache[uId].xp}` });

              channel.send({ embeds: [levelUpEmbed] }).catch(err =>
                console.error('❌ Errore invio level-up embed vocale:', err.message)
              );
            }
          }
        }

        cacheDirty = true;
      }
    });
  }
}

module.exports = {
  handleXP,
  handleVoiceXP,
  loadXPData,
  flushCache,
  getLevel,
  getNextLevelXP,
  addXP,
};
