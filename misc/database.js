/**
 * Modulo di connessione al Database MongoDB (Mongoose)
 *
 * Gestisce la connessione cloud asincrona per garantire la persistenza dei dati
 * anche su hosting con filesystem volatile come Render Free Tier.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { sendStaffAlert } = require('../utils/alertWebhook');

let isConnected = false;

/**
 * Connette il bot al cluster MongoDB Atlas
 * @returns {Promise<boolean>} Status della connessione
 */
async function connectDB() {
  if (isConnected) return true;

  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    logger.warn('⚠️ [DB Warning] MONGODB_URI non è definita nel file config/.env.');
    logger.warn('   Il bot utilizzerà la modalità di compatibilità locale/fallback.');
    return false;
  }

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    logger.info('✅ Connesso con successo a MongoDB Atlas Cloud!');

    // Listener per disconnessione inaspettata a runtime
    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('⚠️ [DB Warning] Connessione a MongoDB Atlas interrotta.');
      sendStaffAlert('Disconnessione Database MongoDB', 'La connessione verso MongoDB Atlas è caduta. Tentativo di riconnessione automatico...');
    });

    return true;
  } catch (error) {
    logger.error('❌ Errore di connessione a MongoDB:', error.message);
    sendStaffAlert('Fallimento Connessione Database (MongoDB)', error);
    return false;
  }
}

/**
 * Restituisce lo stato della connessione DB
 */
function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  isDBConnected,
};
