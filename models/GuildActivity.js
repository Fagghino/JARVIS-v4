const mongoose = require('mongoose');

/**
 * Schema per il tracciamento aggregato dell'attività giornaliera per gilda
 * Utilizzato per generare grafici e statistiche storiche nella Web Dashboard.
 */
const guildActivitySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  date: { type: String, required: true }, // Formato 'YYYY-MM-DD'
  messages: { type: Number, default: 0 },
  voiceMinutes: { type: Number, default: 0 },
  xpGained: { type: Number, default: 0 },
  activeUsers: { type: [String], default: [] } // Set di ID utenti unici attivi nella giornata
}, { timestamps: true });

// Indice univoco per data per server
guildActivitySchema.index({ guildId: 1, date: 1 }, { unique: true });

// Indice per query cronologiche veloci (es. ultimi 7 o 30 giorni)
guildActivitySchema.index({ guildId: 1, date: -1 });

module.exports = mongoose.model('GuildActivity', guildActivitySchema);

