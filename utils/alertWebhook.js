/**
 * Modulo per l'invio di allarmi critici tramite Webhook Discord privato per lo Staff
 *
 * Progettato per ambienti cloud ed effimeri (es. Render Free Tier) per garantire
 * l'osservabilità in tempo reale direttamente su Discord senza dipendere da file locali.
 */

const logger = require('./logger');

// Mappa per il rate-limiting / debouncing degli allarmi identici (max 1 ogni 5 minuti per tipo)
const alertDebounceMap = new Map();
const DEBOUNCE_WINDOW_MS = 5 * 60 * 1000; // 5 minuti

/**
 * Maschera i token e i segreti sensibili all'interno di stringhe e stack trace
 * @param {string} text - Testo da sanificare
 * @returns {string} Testo sanificato
 */
function sanitizeSecrets(text) {
  if (!text || typeof text !== 'string') return String(text || '');

  let sanitized = text;

  // Maschera DISCORD_TOKEN
  if (process.env.DISCORD_TOKEN) {
    sanitized = sanitized.replaceAll(process.env.DISCORD_TOKEN, '***DISCORD_TOKEN_REDACTED***');
  }

  // Maschera MONGODB_URI (e relative credenziali user:pass)
  if (process.env.MONGODB_URI) {
    sanitized = sanitized.replaceAll(process.env.MONGODB_URI, '***MONGODB_URI_REDACTED***');
  }
  sanitized = sanitized.replace(/mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi, 'mongodb$1://***USER:PASSWORD_REDACTED***@');

  // Maschera SESSION_SECRET
  if (process.env.SESSION_SECRET) {
    sanitized = sanitized.replaceAll(process.env.SESSION_SECRET, '***SESSION_SECRET_REDACTED***');
  }

  // Maschera DISCORD_CLIENT_SECRET
  if (process.env.DISCORD_CLIENT_SECRET) {
    sanitized = sanitized.replaceAll(process.env.DISCORD_CLIENT_SECRET, '***CLIENT_SECRET_REDACTED***');
  }

  // Pattern generici per token Discord (24.6.27 o simile)
  sanitized = sanitized.replace(/[A-Za-z0-9_-]{24,28}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/g, '***DISCORD_TOKEN_PATTERN_REDACTED***');

  return sanitized;
}

/**
 * Invia un allarme critico al canale staff tramite Discord Webhook
 *
 * @param {string} title - Titolo breve dell'allarme (es. "Crash Imprevisto")
 * @param {Error|string} error - L'oggetto errore o stringa descrittiva
 * @param {Object} [meta={}] - Metadati opzionali (es. { guildId, command, user })
 * @returns {Promise<boolean>} True se inviato con successo o ignorato volontariamente
 */
async function sendStaffAlert(title, error, meta = {}) {
  const webhookUrl = process.env.STAFF_ERROR_WEBHOOK_URL;

  // Se la variabile d'ambiente non è configurata, proseguiamo silenziosamente
  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    return false;
  }

  const errorMessage = error?.message || String(error || 'Errore non specificato');
  const errorName = error?.name || 'Error';
  const rawStack = error?.stack || '';

  // Chiave per debounce: nome errore + prime 80 lettere del messaggio
  const debounceKey = `${title}:${errorName}:${errorMessage.substring(0, 80)}`;
  const now = Date.now();
  const lastSent = alertDebounceMap.get(debounceKey);

  if (lastSent && now - lastSent.timestamp < DEBOUNCE_WINDOW_MS) {
    lastSent.suppressedCount = (lastSent.suppressedCount || 0) + 1;
    return true; // Soppresso per anti-spam
  }

  const suppressedInfo = lastSent && lastSent.suppressedCount > 0
    ? ` *(Errore ripetuto ${lastSent.suppressedCount} volte negli ultimi 5m)*`
    : '';

  alertDebounceMap.set(debounceKey, { timestamp: now, suppressedCount: 0 });

  // Pulisci periodicamente la mappa
  if (alertDebounceMap.size > 100) {
    for (const [key, val] of alertDebounceMap.entries()) {
      if (now - val.timestamp > DEBOUNCE_WINDOW_MS) alertDebounceMap.delete(key);
    }
  }

  // Sanificazione stack trace e troncamento a 950 caratteri (limite embed field 1024)
  const sanitizedStack = sanitizeSecrets(rawStack || errorMessage);
  const truncatedStack = sanitizedStack.length > 950
    ? sanitizedStack.substring(0, 950) + '\n... [stack troncato]'
    : sanitizedStack;

  const uptimeSec = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = uptimeSec % 60;
  const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

  const ramMb = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

  // Campi dell'Embed Discord
  const fields = [
    {
      name: '🏷️ Tipo Errore',
      value: `\`${errorName}\`${suppressedInfo}`,
      inline: true,
    },
    {
      name: '⚡ Uptime & RAM',
      value: `Uptime: \`${uptimeStr}\`\nRAM: \`${ramMb} MB\``,
      inline: true,
    },
  ];

  if (meta.guildId) {
    fields.push({
      name: '🛡️ Server (Guild ID)',
      value: `\`${meta.guildId}\``,
      inline: true,
    });
  }

  if (meta.command) {
    fields.push({
      name: '⌨️ Comando',
      value: `\`${meta.command}\``,
      inline: true,
    });
  }

  fields.push({
    name: '📝 Messaggio',
    value: `\`\`\`\n${sanitizeSecrets(errorMessage).substring(0, 500)}\n\`\`\``,
    inline: false,
  });

  if (truncatedStack) {
    fields.push({
      name: '🔍 Stack Trace',
      value: `\`\`\`js\n${truncatedStack}\n\`\`\``,
      inline: false,
    });
  }

  const payload = {
    username: 'J.A.R.V.I.S. Sentinel',
    embeds: [
      {
        title: `🚨 ${title}`,
        color: 0xED4245, // Rosso allarme Discord
        fields: fields,
        footer: {
          text: `JARVIS Error Observability • Node ${process.version}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      logger.warn(`[StaffAlert] Webhook ha restituito status HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (webhookErr) {
    // Evita crash a catena se il webhook fallisce
    logger.warn('[StaffAlert] Impossibile inviare notifica webhook:', webhookErr.message);
    return false;
  }
}

module.exports = {
  sendStaffAlert,
  sanitizeSecrets,
};

