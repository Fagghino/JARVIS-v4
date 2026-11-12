/**
 * Sistema di benvenuto e addio membri (Multi-Server)
 *
 * Gestisce gli eventi di ingresso e uscita dei membri dal server:
 * - Assegna automaticamente ruoli a nuovi membri/bot leggendoli dalla configurazione del server
 * - Invia messaggi di benvenuto e addio nei canali configurati per quel server
 */

const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/guildSettings');
const defaultConfig = require('../config/config');

/**
 * Inizializza e attiva il sistema di benvenuto/addio
 * @param {Object} client - Client Discord
 */
module.exports = (client) => {
    // Evento: nuovo membro entra nel server
    client.on('guildMemberAdd', async (member) => {
        try {
            if (!member.guild) return;
            const guildConfig = await getGuildConfig(member.guild.id);

            // Controlla se la funzione welcome è disabilitata
            if (guildConfig.features && guildConfig.features.welcomeEnabled === false) return;

            let roleIdToAssign = member.user.bot
                ? guildConfig.botRoleId
                : guildConfig.newMemberRoleId;

            // Assegna il ruolo appropriato se configurato
            if (roleIdToAssign) {
                const roleToAssign = member.guild.roles.cache.get(roleIdToAssign);
                if (roleToAssign) {
                    await member.roles.add(roleToAssign).catch(err =>
                        console.warn(`⚠️ Impossibile assegnare il ruolo [${roleIdToAssign}]: ${err.message}`)
                    );
                }
            }

            // Invia il messaggio di benvenuto nel canale configurato
            if (guildConfig.welcomeChannelId) {
                const welcomeChannel = member.guild.channels.cache.get(guildConfig.welcomeChannelId);
                if (welcomeChannel) {
                    const templateText = guildConfig.welcomeMessageText || defaultConfig.welcomeMessageText;
                    const formattedDesc = templateText
                        .replace(/{user}/g, `<@${member.id}>`)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{count}/g, member.guild.memberCount);

                    const welcomeEmbed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle(member.user.bot ? '🤖 Nuovo Bot!' : '🎉 Benvenuto!')
                        .setDescription(member.user.bot
                            ? `Un bot si è unito al server: **${member.user.tag}**`
                            : formattedDesc)
                        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
                        .addFields({ name: 'Membri totali:', value: `Ora siamo in **${member.guild.memberCount}**!`, inline: true });

                    await welcomeChannel.send({ embeds: [welcomeEmbed] }).catch(err =>
                        console.error(`❌ Errore invio messaggio benvenuto in [${guildConfig.welcomeChannelId}]:`, err.message)
                    );
                }
            }
        } catch (error) {
            console.error("Errore durante il welcome:", error);
        }
    });

    // Evento: un membro esce dal server
    client.on('guildMemberRemove', async (member) => {
        try {
            if (!member.guild) return;
            const guildConfig = await getGuildConfig(member.guild.id);

            if (guildConfig.features && guildConfig.features.welcomeEnabled === false) return;

            // Invia il messaggio nel canale di addio configurato
            if (guildConfig.goodbyeChannelId) {
                const goodbyeChannel = member.guild.channels.cache.get(guildConfig.goodbyeChannelId);
                if (goodbyeChannel) {
                    const templateText = guildConfig.goodbyeMessageText || defaultConfig.goodbyeMessageText;
                    const formattedDesc = templateText
                        .replace(/{user}/g, `**${member.user.username}**`)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{count}/g, member.guild.memberCount);

                    const goodbyeEmbed = new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle(member.user.bot ? '🤖 Bot rimosso' : '👋 Addio!')
                        .setDescription(member.user.bot
                            ? `Il bot **${member.user.tag}** ha lasciato il server.`
                            : formattedDesc)
                        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
                        .addFields({ name: 'Membri rimanenti:', value: `Ora siamo in **${member.guild.memberCount}**`, inline: true })
                        .setTimestamp();

                    await goodbyeChannel.send({ embeds: [goodbyeEmbed] }).catch(err =>
                        console.error(`❌ Errore invio messaggio addio in [${guildConfig.goodbyeChannelId}]:`, err.message)
                    );
                }
            }
        } catch (error) {
            console.error("Errore durante l'addio:", error);
        }
    });
};
