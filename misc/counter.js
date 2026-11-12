/**
 * Sistema contatore membri del server (Multi-Server)
 *
 * Aggiorna automaticamente i nomi dei canali vocali con il conteggio di:
 * - Membri totali
 * - Utenti (non bot)
 * - Bot
 *
 * Include una gestione sequenziale dei server con ritardo (2s) per evitare rate-limit su Discord API.
 */

const { getGuildConfig } = require('../utils/guildSettings');

/**
 * Inizializza e avvia il sistema di conteggio membri
 * @param {Object} client - Client Discord
 */
module.exports = (client) => {
    /**
     * Aggiorna i nomi dei canali per una singola gilda
     */
    const updateGuildCounter = async (guild, guildConfig) => {
        try {
            if (!guildConfig.totalChannelId && !guildConfig.usersChannelId && !guildConfig.botsChannelId) {
                return;
            }

            // Usa guild.memberCount nativo per il totale
            const totalMembers = guild.memberCount || guild.members.cache.size;

            // Se sono configurati i canali per utenti o bot e la cache non è allineata al totale reale, scarica i membri
            if ((guildConfig.usersChannelId || guildConfig.botsChannelId) && guild.members.cache.size !== totalMembers) {
                await guild.members.fetch({ time: 10000 }).catch(err => {
                    console.warn(`⚠️ Impossibile eseguire fetch membri per counter [${guild.id}]:`, err.message);
                });
            }

            const bots = guild.members.cache.filter(member => member.user.bot).size;
            const users = Math.max(0, totalMembers - bots);

            if (guildConfig.totalChannelId) {
                const totalChannel = guild.channels.cache.get(guildConfig.totalChannelId);
                const newName = `ᴍᴇᴍʙʀɪ ᴛᴏᴛᴀʟɪ: ${totalMembers.toLocaleString()}`;
                if (totalChannel && totalChannel.name !== newName) {
                    await totalChannel.setName(newName).catch(() => {});
                }
            }

            if (guildConfig.usersChannelId) {
                const usersChannel = guild.channels.cache.get(guildConfig.usersChannelId);
                const newName = `ᴜᴛᴇɴᴛɪ: ${users.toLocaleString()}`;
                if (usersChannel && usersChannel.name !== newName) {
                    await usersChannel.setName(newName).catch(() => {});
                }
            }

            if (guildConfig.botsChannelId) {
                const botsChannel = guild.channels.cache.get(guildConfig.botsChannelId);
                const newName = `ʙᴏᴛ: ${bots.toLocaleString()}`;
                if (botsChannel && botsChannel.name !== newName) {
                    await botsChannel.setName(newName).catch(() => {});
                }
            }
        } catch (error) {
            console.error(`❌ Errore aggiornamento counter per [${guild.id}]:`, error.message);
        }
    };

    /**
     * Cicla sequenzialmente su tutti i server con ritardo per evitare rate-limit
     */
    const updateAllCounters = async () => {
        if (!client || !client.guilds) return;

        const guilds = Array.from(client.guilds.cache.values());

        for (const guild of guilds) {
            const guildConfig = await getGuildConfig(guild.id);

            if (guildConfig.features && guildConfig.features.counterEnabled === false) {
                continue;
            }

            await updateGuildCounter(guild, guildConfig);

            // Ritardo di 2 secondi tra i server per prevenire HTTP 429 Rate Limit
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    };

    // Primo aggiornamento dopo 5 secondi dal ready
    setTimeout(() => {
        updateAllCounters();
    }, 5000);

    // Ripeti ogni 10 minuti (Discord permette max 2 rinominazioni per canale ogni 10 min)
    setInterval(updateAllCounters, 600000);
};
