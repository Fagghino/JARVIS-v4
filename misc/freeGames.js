/**
 * Modulo Notifiche Giochi Gratis per J.A.R.V.I.S.
 *
 * Gestisce la formattazione grafica degli embed Discord, i bottoni interattivi di riscatto,
 * la deduplicazione su MongoDB e la distribuzione multiserver in base alle preferenze
 * configurate da ciascun amministratore nella Web Dashboard.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createPublicKey, verify } = require('node:crypto');
const FreeGame = require('../models/FreeGame.js');
const { getGuildConfig } = require('../utils/guildSettings.js');
const { isDBConnected } = require('./database.js');

/**
 * Converte il codice store in un nome visualizzabile formattato
 * @param {string} store 
 * @returns {string}
 */
function formatStoreName(store) {
  if (!store) return 'Store Ufficiale';
  const s = String(store).toLowerCase().trim();
  switch (s) {
    case 'epic':
    case 'epicgames':
      return 'Epic Games Store';
    case 'steam':
      return 'Steam';
    case 'gog':
      return 'GOG.com';
    case 'humble':
      return 'Humble Bundle';
    case 'origin':
    case 'ea':
      return 'EA App / Origin';
    case 'ubi':
    case 'ubisoft':
      return 'Ubisoft Connect';
    case 'prime':
      return 'Amazon Prime Gaming';
    case 'itch':
      return 'itch.io';
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

/**
 * Restituisce il colore tematico per l'embed Discord in base allo store
 * @param {string} store 
 * @returns {number}
 */
function getStoreColor(store) {
  const s = String(store || '').toLowerCase().trim();
  switch (s) {
    case 'epic':
    case 'epicgames':
      return 0x2b2b2b; // Epic Games Dark
    case 'steam':
      return 0x1b2838; // Steam Dark Navy
    case 'gog':
      return 0x7b2cbf; // GOG Purple
    case 'humble':
      return 0xcb2821; // Humble Red
    case 'origin':
    case 'ea':
      return 0xf56c2d; // EA Orange
    case 'ubi':
    case 'ubisoft':
      return 0x0070ff; // Ubisoft Blue
    case 'prime':
      return 0x9146ff; // Prime Purple
    case 'itch':
      return 0xfa5c5c; // itch Red
    default:
      return 0x00b4d8; // J.A.R.V.I.S. Cyber Cyan
  }
}

/**
 * Restituisce l'URL dell'icona ufficiale quadrata dello store (per la thumbnail in alto a destra)
 * @param {string} store 
 * @returns {string}
 */
function getStoreIcon(store) {
  const s = String(store || '').toLowerCase().trim();
  switch (s) {
    case 'epic':
    case 'epicgames':
      return 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/epic-games.png';
    case 'steam':
      return 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/steam.png';
    case 'gog':
      return 'https://img.icons8.com/ios-filled/150/gog-galaxy.png';
    case 'humble':
      return 'https://humblebundle.com/favicon.ico';
    case 'origin':
    case 'ea':
      return 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/electronic-arts.png';
    case 'ubi':
    case 'ubisoft':
      return 'https://img.icons8.com/color/144/ubisoft.png';
    case 'prime':
      return 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/twitch.png';
    case 'itch':
      return 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/itch.png';
    default:
      return 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/epic-games.png';
  }
}

/**
 * Restituisce una emoji coerente per lo store
 * @param {string} store 
 * @returns {string}
 */
function getStoreEmoji(store) {
  const s = String(store || '').toLowerCase();
  if (s.includes('epic')) return '⚡';
  if (s.includes('steam')) return '🎮';
  if (s.includes('gog')) return '👾';
  if (s.includes('prime')) return '📦';
  return '🎁';
}

/**
 * Costruisce l'embed e i componenti interattivi Discord per il gioco
 * @param {Object} game 
 * @param {string} [roleId]
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[], content: string | undefined }}
 */
function buildGameMessage(game, roleId) {
  const storeName = formatStoreName(game.store);
  const storeColor = getStoreColor(game.store);
  const storeIcon = getStoreIcon(game.store);

  // Titolo pulito con link diretto incorporato (senza "GIOCO GRATIS:")
  const embed = new EmbedBuilder()
    .setColor(storeColor)
    .setTitle(game.title || 'Nuovo Gioco Gratuito')
    .setURL(game.url || 'https://freestuffbot.xyz')
    .setThumbnail(storeIcon) // Icona dello store a destra in alto
    .setTimestamp();

  // Linee di descrizione
  const descLines = [];

  // Descrizione del gioco in formattazione citazione (> ...)
  if (game.description && typeof game.description === 'string' && game.description.trim() !== '') {
    const quoted = game.description
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `> ${line}`)
      .join('\n');

    if (quoted) {
      descLines.push(quoted);
      descLines.push('');
    }
  }

  // Riga Prezzo e Scadenza: ~~39,99 €~~ ➔ GRATIS fino al 20 novembre 2026 alle 17:00
  let priceLine = '';
  if (game.orgPrice && game.orgPrice.trim() !== '') {
    priceLine += `~~${game.orgPrice}~~ ➔ **GRATIS**`;
  } else {
    priceLine += '**GRATIS**';
  }

  if (game.until) {
    const untilDate = new Date(game.until);
    if (!isNaN(untilDate.getTime())) {
      const unixSec = Math.floor(untilDate.getTime() / 1000);
      priceLine += ` fino al <t:${unixSec}:f>`;
    }
  }
  descLines.push(priceLine);

  embed.setDescription(descLines.join('\n'));

  // Foto orizzontale in lungo (16:9) del gioco sotto i dettagli
  const bannerImage = game.image || game.thumbnail;
  if (bannerImage && typeof bannerImage === 'string' && bannerImage.startsWith('http')) {
    embed.setImage(bannerImage);
  }

  embed.setFooter({
    text: 'J.A.R.V.I.S. Gaming Alerts'
  });

  // Bottone interattivo per riscattare direttamente il gioco (SENZA emoji)
  const components = [];
  if (game.url && game.url.startsWith('http')) {
    const claimButton = new ButtonBuilder()
      .setLabel(`Riscatta su ${storeName}`)
      .setStyle(ButtonStyle.Link)
      .setURL(game.url);

    const row = new ActionRowBuilder().addComponents(claimButton);
    components.push(row);
  }

  // Menzione ruolo fuori dall'embed: solo il tag senza testo aggiuntivo
  let content = undefined;
  if (roleId) {
    if (roleId === 'everyone' || roleId === '@everyone') {
      content = '@everyone';
    } else {
      content = `<@&${roleId}>`;
    }
  }

  return { embed, components, content };
}

/**
 * Trasmette la notifica di un gioco a tutti i server abilitati
 * @param {import('discord.js').Client} client 
 * @param {Object} gameData 
 * @param {Object} [options]
 * @param {string} [options.targetGuildId] - Se valorizzato, invia solo a questo server (es. durante test)
 * @param {boolean} [options.isTest] - Se true, salta il salvataggio duplicati su DB
 * @returns {Promise<{ dispatched: number, errors: number, alreadyDispatched?: boolean }>}
 */
async function broadcastFreeGame(client, gameData, options = {}) {
  if (!client || !client.isReady()) {
    console.warn('⚠️ Impossibile trasmettere gioco: Discord client non pronto.');
    return { dispatched: 0, errors: 0 };
  }

  if (!gameData || !gameData.title || !gameData.url) {
    console.warn('⚠️ Dati gioco non validi per la trasmissione:', gameData);
    return { dispatched: 0, errors: 0 };
  }

  const isTest = Boolean(options.isTest);
  const targetGuildId = options.targetGuildId || null;

  // 1. Controllo duplicati su MongoDB (se non è un test e DB è connesso)
  if (!isTest && isDBConnected() && gameData.gameId) {
    try {
      const existing = await FreeGame.findOne({ gameId: String(gameData.gameId) }).lean();
      if (existing) {
        console.log(`ℹ️ [FreeGames] Gioco "${gameData.title}" [${gameData.gameId}] già trasmesso in precedenza.`);
        return { dispatched: 0, errors: 0, alreadyDispatched: true };
      }

      await FreeGame.create({
        gameId: String(gameData.gameId),
        title: gameData.title,
        store: gameData.store || 'unknown',
        url: gameData.url,
        description: gameData.description || '',
        orgPrice: gameData.orgPrice || '',
        price: gameData.price || '0.00',
        thumbnail: gameData.image || gameData.thumbnail || '',
        kind: gameData.kind || 'game',
        type: gameData.type || 'keep',
        until: gameData.until ? new Date(gameData.until) : null
      });
      console.log(`💾 [FreeGames] Offerta salvata su MongoDB: "${gameData.title}"`);
    } catch (dbErr) {
      console.error('❌ [FreeGames] Errore verifica/salvataggio duplicato MongoDB:', dbErr.message);
    }
  }

  let dispatchedCount = 0;
  let errorsCount = 0;

  // 2. Itera sui server Discord
  const guildsToProcess = targetGuildId
    ? [client.guilds.cache.get(targetGuildId)].filter(Boolean)
    : Array.from(client.guilds.cache.values());

  for (const guild of guildsToProcess) {
    try {
      const guildConfig = await getGuildConfig(guild.id);
      if (!guildConfig) continue;

      // Se non è un test esplicito, verifica che la feature sia attiva
      if (!isTest && !guildConfig?.features?.freeGamesEnabled) {
        continue;
      }

      const channelId = guildConfig.freeGamesChannelId;
      if (!channelId) continue;

      // Filtri personalizzati del server
      const filter = guildConfig.freeGamesFilter || { keepOnly: true, includeDlc: false };
      if (!isTest) {
        if (filter.keepOnly && gameData.type !== 'keep') {
          continue; // Salta weekend di prova se il server vuole solo keep-forever
        }
        if (!filter.includeDlc && gameData.kind === 'dlc') {
          continue; // Salta DLC se il server vuole solo giochi completi
        }
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) {
        console.warn(`⚠️ [FreeGames] Canale [${channelId}] su server [${guild.name}] non trovato o non testuale.`);
        continue;
      }

      // Verifica permessi del bot nel canale
      const me = guild.members.me;
      if (me) {
        const perms = channel.permissionsFor(me);
        if (perms && (!perms.has(PermissionFlagsBits.ViewChannel) || !perms.has(PermissionFlagsBits.SendMessages) || !perms.has(PermissionFlagsBits.EmbedLinks))) {
          console.warn(`⚠️ [FreeGames] Permessi insufficienti nel canale #${channel.name} su [${guild.name}] (mancano ViewChannel/SendMessages/EmbedLinks).`);
          errorsCount++;
          continue;
        }
      }

      const { embed, components, content } = buildGameMessage(gameData, guildConfig.freeGamesRoleId);

      await channel.send({
        content,
        embeds: [embed],
        components
      });

      dispatchedCount++;
    } catch (guildErr) {
      console.error(`❌ [FreeGames] Errore invio notifica su server [${guild.id}]:`, guildErr.message);
      errorsCount++;
    }
  }

  console.log(`📢 [FreeGames] Broadcast completato: ${dispatchedCount} inviati, ${errorsCount} errori.`);
  return { dispatched: dispatchedCount, errors: errorsCount };
}

/**
 * Invia una notifica di prova su un singolo server per validare canale, permessi e layout grafico
 * @param {import('discord.js').Client} client 
 * @param {string} guildId 
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function sendTestNotification(client, guildId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return { success: false, message: 'Server Discord non trovato o bot non presente.' };
  }

  const guildConfig = await getGuildConfig(guildId);
  if (!guildConfig || !guildConfig.freeGamesChannelId) {
    return { success: false, message: 'Nessun canale per i giochi gratis configurato. Seleziona e salva un canale prima di eseguire il test.' };
  }

  const testGame = {
    gameId: `test-${Date.now()}`,
    title: "Death Stranding Director's Cut",
    store: 'epic',
    url: 'https://store.epicgames.com/p/death-stranding-directors-cut',
    orgPrice: '39,99 €',
    price: '0,00 €',
    description: "Death Stranding Director's Cut è la versione definitiva del celebre capolavoro di Hideo Kojima, arricchita con nuove missioni, armi, veicoli e scenari grafici mozzafiato.",
    image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1850570/header.jpg',
    thumbnail: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1850570/header.jpg',
    kind: 'game',
    type: 'keep',
    until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Scadenza tra 7 giorni
  };

  const res = await broadcastFreeGame(client, testGame, {
    isTest: true,
    targetGuildId: guildId
  });

  if (res.dispatched > 0) {
    return { success: true, message: 'Notifica di prova inviata con successo sul canale selezionato!' };
  } else {
    return { success: false, message: 'Impossibile inviare il messaggio di prova. Verifica che il bot abbia i permessi di invio messaggi ed embed nel canale specificato.' };
  }
}

/**
 * Valida la firma crittografica Ed25519 dei webhook di FreeStuff
 */
function verifyFreeStuffSignature(rawBodyBuffer, signatureHeader, messageIdHeader, timestampHeader, publicKeyBase64) {
  if (!publicKeyBase64) return true; // Se la chiave non è impostata in .env, accetta la richiesta (sviluppo locale)
  if (!rawBodyBuffer || !signatureHeader || !messageIdHeader || !timestampHeader) return false;

  try {
    const key = createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });

    const [version, sigB64] = String(signatureHeader).split(',');
    if (version !== 'v1a' || !sigB64) return false;

    const sigBuff = Buffer.from(sigB64, 'base64');
    const contentBuff = Buffer.from(`${messageIdHeader}.${timestampHeader}.${rawBodyBuffer.toString('utf8')}`, 'utf8');

    return verify(null, new Uint8Array(contentBuff), key, sigBuff);
  } catch (err) {
    console.error('❌ [FreeGames] Errore verifica firma Ed25519:', err.message);
    return false;
  }
}

/**
 * Estrae una lista normalizzata di giochi da un payload webhook (supporta FreeStuff v2, v1 o payload generico)
 * @param {Object} payload
 * @returns {Array<Object>} Lista di giochi normalizzati
 */
function parseWebhookPayload(payload) {
  if (!payload || typeof payload !== 'object') return [];

  const results = [];

  // Helper per estrarre la descrizione (preferendo italiano o inglese)
  const extractDescription = (rawDesc) => {
    if (!rawDesc) return '';
    if (Array.isArray(rawDesc) && rawDesc.length > 0) {
      const it = rawDesc.find(d => d && (d.lang === 'it-IT' || d.lang === 'it'));
      const en = rawDesc.find(d => d && (d.lang === 'en-US' || d.lang === 'en'));
      return (it && it.text) || (en && en.text) || rawDesc[0].text || '';
    }
    if (typeof rawDesc === 'string') return rawDesc;
    return '';
  };

  // Helper per estrarre l'immagine orizzontale panoramica (AR_WIDE)
  const extractWideImage = (rawImages) => {
    if (!Array.isArray(rawImages) || rawImages.length === 0) return '';
    // Flag AR_WIDE ha valore bit 1 (1<<1 = 2)
    const wideImg = rawImages.find(img => img && (typeof img.flags === 'object' ? img.flags.AR_WIDE : ((img.flags & 2) !== 0)));
    return (wideImg && wideImg.url) || (rawImages[0] && rawImages[0].url) || '';
  };

  // 1. FreeStuff API v2 event: 'fsb:event:announcement_created'
  if (payload.type === 'fsb:event:announcement_created' && payload.data) {
    const products = payload.data.resolvedProducts || [];
    for (const prod of products) {
      const bestUrl = (prod.urls && prod.urls.length) ? (prod.urls.find(u => u.url)?.url || prod.urls[0].url) : '';
      const wideBanner = extractWideImage(prod.images);
      const desc = extractDescription(prod.description);
      const priceObj = (prod.prices && prod.prices.length) ? prod.prices[0] : null;
      const orgPrice = priceObj ? `${priceObj.oldValue} ${priceObj.currency || '€'}` : '';

      results.push({
        gameId: String(prod.id),
        title: prod.title || 'Gioco Gratuito',
        store: prod.store || (prod.urls && prod.urls[0] && prod.urls[0].store) || 'epic',
        url: bestUrl || 'https://freestuffbot.xyz',
        description: desc,
        orgPrice,
        price: '0.00',
        image: wideBanner,
        thumbnail: wideBanner,
        kind: prod.kind || 'game',
        type: prod.type || 'keep',
        until: prod.until ? new Date(prod.until) : null
      });
    }
    return results;
  }

  // 2. FreeStuff API v2 event: 'fsb:event:product_updated'
  if (payload.type === 'fsb:event:product_updated' && payload.data) {
    const prod = payload.data;
    const bestUrl = (prod.urls && prod.urls.length) ? (prod.urls.find(u => u.url)?.url || prod.urls[0].url) : '';
    const wideBanner = extractWideImage(prod.images);
    const desc = extractDescription(prod.description);
    const priceObj = (prod.prices && prod.prices.length) ? prod.prices[0] : null;
    const orgPrice = priceObj ? `${priceObj.oldValue} ${priceObj.currency || '€'}` : '';

    results.push({
      gameId: String(prod.id),
      title: prod.title || 'Gioco Gratuito',
      store: prod.store || (prod.urls && prod.urls[0] && prod.urls[0].store) || 'epic',
      url: bestUrl || 'https://freestuffbot.xyz',
      description: desc,
      orgPrice,
      price: '0.00',
      image: wideBanner,
      thumbnail: wideBanner,
      kind: prod.kind || 'game',
      type: prod.type || 'keep',
      until: prod.until ? new Date(prod.until) : null
    });
    return results;
  }

  // 3. Payload generico / diretto (es. inviato da form di test o webhook personalizzato)
  if (payload.title && payload.url) {
    results.push({
      gameId: String(payload.gameId || payload.id || `custom-${Date.now()}`),
      title: payload.title,
      store: payload.store || 'epic',
      url: payload.url,
      description: payload.description || '',
      orgPrice: payload.orgPrice || '',
      price: payload.price || '0.00',
      image: payload.image || payload.thumbnail || '',
      thumbnail: payload.thumbnail || payload.image || '',
      kind: payload.kind || 'game',
      type: payload.type || 'keep',
      until: payload.until ? new Date(payload.until) : null
    });
    return results;
  }

  return results;
}

module.exports = {
  broadcastFreeGame,
  sendTestNotification,
  formatStoreName,
  getStoreColor,
  getStoreIcon,
  getStoreEmoji,
  buildGameMessage,
  verifyFreeStuffSignature,
  parseWebhookPayload
};
