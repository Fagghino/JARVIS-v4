/**
 * Comando /embed - Crea messaggi embed personalizzati (solo admin)
 *
 * Permette agli amministratori di creare e inviare messaggi embed
 * con titolo e descrizione personalizzati.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Manda un messaggio in un embed (SOLO ADMIN)')
        .addStringOption(option =>
            option.setName('titolo')
                .setDescription('Il titolo dell\'embed')
                .setRequired(true)
                .setMaxLength(256)
        )
        .addStringOption(option =>
            option.setName('testo')
                .setDescription('Il testo che vuoi inviare nell\'embed')
                .setRequired(true)
                .setMaxLength(4096)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    async execute(interaction) {
        const titolo = interaction.options.getString('titolo');
        const testo = interaction.options.getString('testo').replace(/\\n/g, '\n');

        // Crea l'embed con i parametri specificati
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(titolo)
            .setDescription(testo);

        await interaction.reply({ embeds: [embed] });
    }
};
