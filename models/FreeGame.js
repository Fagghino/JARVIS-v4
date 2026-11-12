const mongoose = require('mongoose');

const freeGameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  store: { type: String, default: 'unknown' },
  url: { type: String, required: true },
  description: { type: String, default: '' },
  orgPrice: { type: String, default: '' },
  price: { type: String, default: '0.00' },
  thumbnail: { type: String, default: '' },
  kind: { type: String, default: 'game' },
  type: { type: String, default: 'keep' },
  until: { type: Date, default: null },
  firstSeenAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indice TTL opzionale per ripulire giochi scaduti da oltre 30 giorni (se until è valorizzato)
freeGameSchema.index({ until: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { until: { $ne: null } } });

module.exports = mongoose.model('FreeGame', freeGameSchema);

