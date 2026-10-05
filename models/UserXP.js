const mongoose = require('mongoose');

const userXPSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  username: { type: String, default: 'Unknown' },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 }
}, { timestamps: true });

// Compound unique index for guildId and userId
userXPSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Compound index for guild leaderboard queries ordered by XP (SUGGERIMENTO-04)
userXPSchema.index({ guildId: 1, xp: -1 });

module.exports = mongoose.model('UserXP', userXPSchema);
