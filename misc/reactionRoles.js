/**
 * Sistema Reaction Roles (Multi-Server)
 *
 * Gestisce l'assegnazione automatica di ruoli tramite reazioni a messaggi.
 * La configurazione (guildId, messageId, channelId, emoji → ruolo) è salvata direttamente su MongoDB Cloud.
 */

const { isDBConnected } = require('./database');
const ReactionRoleModel = require('../models/ReactionRole');

/**
 * Carica tutti i dati reaction-role da MongoDB
 */
async function loadData() {
  if (isDBConnected() && ReactionRoleModel) {
    try {
      const records = await ReactionRoleModel.find({}).lean();
      const data = {};
      records.forEach(r => {
        const key = `${r.channelId}_${r.messageId}`;
        data[key] = {
          guildId: r.guildId,
          channelId: r.channelId,
          messageId: r.messageId,
          title: r.title || '',
          roles: r.rolesMap || {}
        };
      });
      return data;
    } catch (err) {
      console.error('❌ Errore caricamento reaction roles da MongoDB:', err.message);
    }
  }
  return {};
}

/**
 * Aggiunge una configurazione reaction-role
 */
async function addReactionRole(guildId, channelId, messageId, emojiRoleMap, title = '') {
  if (isDBConnected() && ReactionRoleModel) {
    try {
      await ReactionRoleModel.findOneAndUpdate(
        { channelId, messageId },
        { guildId, channelId, messageId, title, rolesMap: emojiRoleMap },
        { upsert: true, new: true }
      );
      console.log(`✅ Reaction-role salvato su MongoDB per messaggio ${messageId}`);
    } catch (err) {
      console.error('❌ Errore salvataggio reaction role su MongoDB:', err.message);
    }
  }
}

/**
 * Cerca una configurazione reaction-role per titolo all'interno di un server
 */
async function getReactionRoleByTitle(guildId, title) {
  if (isDBConnected() && ReactionRoleModel) {
    const doc = await ReactionRoleModel.findOne({ guildId, title }).lean();
    if (doc) return { guildId: doc.guildId, channelId: doc.channelId, messageId: doc.messageId, title: doc.title, roles: doc.rolesMap };
  }
  const data = await loadData();
  return Object.values(data).find(entry => entry.guildId === guildId && entry.title === title) || null;
}

/**
 * Restituisce tutti i titoli dei messaggi reaction-role di un server
 */
async function getTitlesForGuild(guildId) {
  if (isDBConnected() && ReactionRoleModel) {
    const docs = await ReactionRoleModel.find({ guildId }).lean();
    return docs.map(d => d.title).filter(Boolean);
  }
  const data = await loadData();
  return Object.values(data)
    .filter(entry => entry.guildId === guildId && entry.title)
    .map(entry => entry.title);
}

/**
 * Aggiunge una coppia emoji/ruolo a un messaggio reaction-role esistente
 */
async function addEmojiRoleToMessage(channelId, messageId, emojiKey, roleId) {
  if (isDBConnected() && ReactionRoleModel) {
    const doc = await ReactionRoleModel.findOne({ channelId, messageId });
    if (!doc) return false;
    doc.rolesMap = doc.rolesMap || {};
    doc.rolesMap[emojiKey] = roleId;
    doc.markModified('rolesMap');
    await doc.save();
    return true;
  }
  return false;
}

/**
 * Rimuove una configurazione reaction-role
 */
async function removeReactionRole(channelId, messageId) {
  if (isDBConnected() && ReactionRoleModel) {
    const res = await ReactionRoleModel.deleteOne({ channelId, messageId });
    return res.deletedCount > 0;
  }
  return false;
}

/**
 * Restituisce la configurazione per un messaggio specifico
 */
async function getReactionRole(channelId, messageId) {
  if (isDBConnected() && ReactionRoleModel) {
    const doc = await ReactionRoleModel.findOne({ channelId, messageId }).lean();
    if (doc) return { guildId: doc.guildId, channelId: doc.channelId, messageId: doc.messageId, title: doc.title, roles: doc.rolesMap };
  }
  return null;
}

/**
 * Restituisce tutte le configurazioni salvate
 */
async function getAllReactionRoles() {
  return await loadData();
}

/**
 * Estrae la chiave univoca di un'emoji
 */
function getEmojiKey(reaction) {
  return reaction.emoji.id ?? reaction.emoji.name;
}

/**
 * Gestisce l'aggiunta di una reazione
 */
async function handleReactionAdd(reaction, user) {
  if (user.bot) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch (err) { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch (err) { return; }
  }

  const config = await getReactionRole(reaction.message.channelId, reaction.message.id);
  if (!config) return;

  const emojiKey = getEmojiKey(reaction);
  const roleId = config.roles[emojiKey];
  if (!roleId) return;

  try {
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);
    if (member.roles.cache.has(roleId)) return;
    await member.roles.add(roleId);
    console.log(`✅ Ruolo ${roleId} assegnato a ${user.tag} in [${guild.id}]`);
  } catch (err) {
    console.error(`❌ Errore assegnazione ruolo a ${user.tag}:`, err.message);
  }
}

/**
 * Gestisce la rimozione di una reazione
 */
async function handleReactionRemove(reaction, user) {
  if (user.bot) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch (err) { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch (err) { return; }
  }

  const config = await getReactionRole(reaction.message.channelId, reaction.message.id);
  if (!config) return;

  const emojiKey = getEmojiKey(reaction);
  const roleId = config.roles[emojiKey];
  if (!roleId) return;

  try {
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);
    if (!member.roles.cache.has(roleId)) return;
    await member.roles.remove(roleId);
    console.log(`✅ Ruolo ${roleId} rimosso da ${user.tag} in [${guild.id}]`);
  } catch (err) {
    console.error(`❌ Errore rimozione ruolo da ${user.tag}:`, err.message);
  }
}

module.exports = {
  addReactionRole,
  removeReactionRole,
  getReactionRole,
  getAllReactionRoles,
  getReactionRoleByTitle,
  getTitlesForGuild,
  addEmojiRoleToMessage,
  handleReactionAdd,
  handleReactionRemove,
};
