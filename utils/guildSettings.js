/**
 * Utility per la gestione della configurazione per-server (GuildSettings)
 *
 * Mantiene una cache in memoria per ciascun guildId per garantire risposte ultra-veloci
 * e sincronizza le modifiche su MongoDB Atlas.
 * Se MongoDB non è disponibile o un server non ha ancora una configurazione custom,
 * restituisce i valori predefiniti di fallback presi da config/config.js.
 */

const defaultConfig = require('../config/config.js');
const { isDBConnected } = require('../misc/database.js');
let GuildSettingsModel = null;

try {
  GuildSettingsModel = require('../models/GuildSettings.js');
} catch (err) {
  // Ignorato se il modello non è registrato
}

// Cache in memoria Map<guildId, ConfigObject>
const settingsCache = new Map();

/**
 * Ottiene la configurazione per uno specifico server Discord
 * @param {string} guildId - ID del server Discord
 * @returns {Promise<Object>} Oggetto di configurazione del server
 */
async function getGuildConfig(guildId) {
  if (!guildId) return { ...defaultConfig };

  // Controlla prima la cache in memoria
  if (settingsCache.has(guildId)) {
    return settingsCache.get(guildId);
  }

  let config = {
    guildId,
    welcomeChannelId: defaultConfig.welcomeChannelId || '',
    goodbyeChannelId: defaultConfig.goodbyeChannelId || '',
    welcomeMessageText: defaultConfig.welcomeMessageText,
    goodbyeMessageText: defaultConfig.goodbyeMessageText,
    levelUpChannelId: defaultConfig.levelUpChannelId || '',
    levelUpMessageText: defaultConfig.levelUpMessageText,
    totalChannelId: defaultConfig.totalChannelId || '',
    usersChannelId: defaultConfig.usersChannelId || '',
    botsChannelId: defaultConfig.botsChannelId || '',
    newMemberRoleId: defaultConfig.newMemberRoleId || '',
    botRoleId: defaultConfig.botRoleId || '',
    inviteLink: defaultConfig.inviteLink || '',
    botNickname: '',
    features: {
      xpEnabled: true,
      levelUpNotificationEnabled: true,
      welcomeEnabled: true,
      reactionRolesEnabled: true,
      counterEnabled: true
    },
    commands: {
      flip: true,
      ping: true,
      roll: true,
      serverinfo: true,
      userinfo: true
    }
  };

  if (isDBConnected() && GuildSettingsModel) {
    try {
      const dbConfig = await GuildSettingsModel.findOne({ guildId }).lean();
      if (dbConfig) {
        config = {
          ...config,
          ...dbConfig,
          features: {
            ...config.features,
            ...(dbConfig.features || {})
          },
          commands: {
            ...config.commands,
            ...(dbConfig.commands || {})
          }
        };
      }
    } catch (error) {
      console.error(`❌ Errore lettura GuildSettings per [${guildId}]:`, error.message);
    }
  }

  // Salva nella cache locale
  settingsCache.set(guildId, config);
  return config;
}

/**
 * Aggiorna la configurazione per uno specifico server Discord
 * @param {string} guildId - ID del server Discord
 * @param {Object} updatedFields - Campi da aggiornare
 * @returns {Promise<Object>} Configurazione aggiornata
 */
async function updateGuildConfig(guildId, updatedFields) {
  const current = await getGuildConfig(guildId);

  const newConfig = {
    ...current,
    ...updatedFields,
    guildId,
    features: {
      ...(current.features || {}),
      ...(updatedFields.features || {})
    },
    commands: {
      ...(current.commands || {}),
      ...(updatedFields.commands || {})
    }
  };

  // Aggiorna la cache in memoria
  settingsCache.set(guildId, newConfig);

  // Sincronizza con MongoDB se connesso
  if (isDBConnected() && GuildSettingsModel) {
    try {
      await GuildSettingsModel.findOneAndUpdate(
        { guildId },
        { $set: newConfig },
        { upsert: true, new: true }
      );
      console.log(`⚙️ Configurazione aggiornata su MongoDB per il server [${guildId}]`);
    } catch (error) {
      console.error(`❌ Errore aggiornamento GuildSettings per [${guildId}]:`, error.message);
    }
  }

  return newConfig;
}

/**
 * Invalida o cancella la cache per uno specifico server
 * @param {string} guildId
 */
function clearGuildCache(guildId) {
  if (guildId) settingsCache.delete(guildId);
  else settingsCache.clear();
}

module.exports = {
  getGuildConfig,
  updateGuildConfig,
  clearGuildCache,
};
