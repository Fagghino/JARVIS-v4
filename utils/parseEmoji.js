/**
 * Utility per il parsing di emoji Discord (custom o unicode)
 *
 * @param {string} input - Es. "🎮" oppure "<:custom:123456789>" o "<a:custom:123456789>"
 * @returns {{ key: string, display: string }} key = chiave per il JSON/evento, display = visualizzazione per l'embed
 */
function parseEmoji(input) {
  if (!input || typeof input !== 'string') {
    return { key: '', display: '' };
  }
  const trimmed = input.trim();

  // Custom emoji: <:name:id> oppure <a:name:id> (animated)
  const customMatch = trimmed.match(/^<a?:([\w]+):(\d+)>$/);
  if (customMatch) {
    return {
      key: customMatch[2],     // ID numerico → chiave nel JSON e in handleReactionAdd
      display: trimmed,        // <:name:id> → visualizzato nell'embed
    };
  }

  // Unicode emoji (o qualsiasi altro testo)
  return {
    key: trimmed,
    display: trimmed,
  };
}

module.exports = {
  parseEmoji,
};
