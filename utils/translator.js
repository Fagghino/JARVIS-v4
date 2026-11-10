/**
 * Gestore di traduzione centralizzato
 *
 * Supporta DeepL API (consigliato, free tier 500k caratteri) e Google Cloud Translation API.
 * Se non configurate, effettua il fallback su Google Translate gratuito tramite la libreria locale,
 * segnalando un avviso nei log per stabilità in produzione.
 */

const https = require('https');
const logger = require('./logger');

// Variabile per evitare di spammare il warning nei log ad ogni traduzione
let warnedAboutUnofficialAPI = false;

/**
 * Effettua una richiesta HTTPS POST generica
 * @param {string} url - URL completo
 * @param {Object} headers - Headers della richiesta
 * @param {Object} bodyData - Oggetto da inviare come JSON
 * @returns {Promise<Object>} Risposta parseata in JSON
 */
function makeHttpsPost(url, headers, bodyData) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(bodyData);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Errore di parsing JSON nella risposta: ${e.message}`));
          }
        } else {
          reject(new Error(`Richiesta fallita con status code ${res.statusCode}: ${data}`));
        }
      });
    });

    req.setTimeout(8000, () => {
      req.destroy(new Error('Timeout richiesta HTTPS (8s)'));
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Traduce il testo fornito nella lingua di destinazione
 * @param {string} text - Testo da tradurre
 * @param {string} targetLang - Lingua di destinazione (es. 'it')
 * @returns {Promise<string>} Testo tradotto
 */
async function translateText(text, targetLang = 'it') {
  const deeplKey = process.env.DEEPL_API_KEY;
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  const target = targetLang.toUpperCase();

  // 1. Uso di DeepL API (se configurata)
  if (deeplKey) {
    try {
      logger.debug('Utilizzo di DeepL API per la traduzione.');
      const isFree = deeplKey.endsWith(':fx');
      const endpoint = isFree
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate';

      const response = await makeHttpsPost(
        endpoint,
        { 'Authorization': `DeepL-Auth-Key ${deeplKey}` },
        { text: [text], target_lang: target }
      );

      if (response && response.translations && response.translations[0]) {
        return response.translations[0].text;
      }
      throw new Error('Formato risposta DeepL non valido.');
    } catch (error) {
      logger.error('Errore durante la traduzione con DeepL API:', error.message);
      logger.warn('Tentativo di fallback sul traduttore di riserva.');
    }
  }

  // 2. Uso di Google Cloud Translation API ufficiale (se configurata)
  if (googleKey) {
    try {
      logger.debug('Utilizzo di Google Translation API ufficiale.');
      const endpoint = `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`;
      
      const response = await makeHttpsPost(
        endpoint,
        {},
        { q: text, target: targetLang.toLowerCase() }
      );

      if (response && response.data && response.data.translations && response.data.translations[0]) {
        return response.data.translations[0].translatedText;
      }
      throw new Error('Formato risposta Google Translate non valido.');
    } catch (error) {
      logger.error('Errore durante la traduzione con Google Translation API:', error.message);
      logger.warn('Tentativo di fallback sul traduttore di riserva.');
    }
  }

  // 3. Fallback su libreria gratuita non ufficiale
  if (!warnedAboutUnofficialAPI) {
    logger.warn('Nessuna chiave API configurata per la traduzione (DEEPL_API_KEY o GOOGLE_TRANSLATE_API_KEY). ' +
      'Utilizzo del fallback gratuito non ufficiale. Questo potrebbe smettere di funzionare o essere rate-limitato.');
    warnedAboutUnofficialAPI = true;
  }

  // Utilizza la libreria esistente
  const translateFallback = require('@vitalets/google-translate-api');
  const result = await translateFallback(text, { to: targetLang.toLowerCase() });
  return result.text;
}

module.exports = {
  translateText
};
