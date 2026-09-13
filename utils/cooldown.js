/**
 * Sistema di cooldown per i comandi slash
 *
 * Implementa un rate limiting per utente per evitare
 * spam di comandi pesanti (es. /classifica che interroga MongoDB Atlas).
 *
 * Uso in index.js:
 *   const { checkCooldown } = require('./utils/cooldown');
 *   // dentro interactionCreate:
 *   const cooldownResult = checkCooldown(interaction);
 *   if (cooldownResult) return interaction.reply({ content: cooldownResult, ephemeral: true });
 */

// Map di cooldown: Map<commandName, Map<userId, timestampExpiry>>
const cooldowns = new Map();

// Cooldown personalizzati per comando (in secondi). Default: 3 secondi.
const COOLDOWN_SECONDS = {
  classifica: 10,   // Interroga MongoDB Atlas
  traduci: 5,       // Chiama API esterna
  server: 5,        // Fetch membri
  help: 3,
  help_admin: 3,
  ping: 3,
};

const DEFAULT_COOLDOWN = 3;

/**
 * Verifica se un utente è in cooldown per un dato comando
 * @param {Object} interaction - Interazione Discord
 * @returns {string|null} Messaggio di errore se in cooldown, null se OK
 */
function checkCooldown(interaction) {
  const commandName = interaction.commandName;
  const userId = interaction.user.id;

  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Map());
  }

  const timestamps = cooldowns.get(commandName);
  const cooldownAmount = (COOLDOWN_SECONDS[commandName] || DEFAULT_COOLDOWN) * 1000;
  const now = Date.now();

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId);

    if (now < expirationTime) {
      const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
      return `⏳ Aspetta **${timeLeft}s** prima di usare \`/${commandName}\` di nuovo.`;
    }
  }

  // Imposta il cooldown
  timestamps.set(userId, now + cooldownAmount);

  // Rimuovi automaticamente dopo la scadenza (pulizia memoria)
  setTimeout(() => timestamps.delete(userId), cooldownAmount);

  return null;
}

module.exports = { checkCooldown };
