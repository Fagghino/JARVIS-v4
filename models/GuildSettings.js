const mongoose = require('mongoose');
const config = require('../config/config.js');

const guildSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  welcomeChannelId: { type: String, default: '' },
  goodbyeChannelId: { type: String, default: '' },
  welcomeMessageText: { type: String, default: config.welcomeMessageText },
  goodbyeMessageText: { type: String, default: config.goodbyeMessageText },
  levelUpChannelId: { type: String, default: '' },
  levelUpMessageText: { type: String, default: config.levelUpMessageText },
  totalChannelId: { type: String, default: '' },
  usersChannelId: { type: String, default: '' },
  botsChannelId: { type: String, default: '' },
  newMemberRoleId: { type: String, default: '' },
  botRoleId: { type: String, default: '' },
  inviteLink: { type: String, default: '' },
  botNickname: { type: String, default: '' },
  freeGamesChannelId: { type: String, default: '' },
  freeGamesRoleId: { type: String, default: '' },
  freeGamesFilter: {
    keepOnly: { type: Boolean, default: true },
    includeDlc: { type: Boolean, default: false }
  },
  features: {
    xpEnabled: { type: Boolean, default: true },
    levelUpNotificationEnabled: { type: Boolean, default: true },
    welcomeEnabled: { type: Boolean, default: true },
    reactionRolesEnabled: { type: Boolean, default: true },
    counterEnabled: { type: Boolean, default: true },
    freeGamesEnabled: { type: Boolean, default: false }
  },
  commands: {
    flip: { type: Boolean, default: true },
    ping: { type: Boolean, default: true },
    roll: { type: Boolean, default: true },
    serverinfo: { type: Boolean, default: true },
    userinfo: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);
