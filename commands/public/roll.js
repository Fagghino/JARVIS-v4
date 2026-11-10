/**
 * Comando /roll - Lancio dado personalizzato
 *
 * Lancia un dado con un numero specificato di facce e mostra il risultato.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Lancia un dado con un numero specifico di facce.')
        .setDMPermission(false)
        .addIntegerOption(option =>
            option.setName('facce')
                .setDescription('Numero di facce del dado (minimo 2)')
                .setMinValue(2)
                .setRequired(true)),
    async execute(interaction) {
        const facce = interaction.options.getInteger('facce');

        // Valida il numero di facce
        if (facce < 2) {
            return interaction.reply({ content: 'Il dado deve avere almeno 2 facce!', ephemeral: true });
        }

        // Genera il risultato del lancio
        const risultato = Math.floor(Math.random() * facce) + 1;

        // Crea l'embed con il risultato
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('Lancio del Dado')
            .setDescription(`Hai lanciato un dado con ${facce} facce e hai ottenuto: **${risultato}** 🎲`);

        await interaction.reply({ embeds: [embed] });
    }
};
