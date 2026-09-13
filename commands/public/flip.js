/**
 * Comando /flip - Lancio della moneta
 *
 * Simula il lancio di una moneta e mostra il risultato (Testa o Croce).
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('flip')
        .setDescription('Lancia una moneta e mostra il risultato.'),
    async execute(interaction) {
        // Genera risultato casuale: Testa o Croce
        const risultato = Math.random() < 0.5 ? 'Testa' : 'Croce';
        const emoji = risultato === 'Testa' ? '👑' : '🪙';

        // Crea l'embed con il risultato
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('Lancio della Moneta')
            .setDescription(`La moneta è caduta su: **${risultato}** ${emoji}`);

        await interaction.reply({ embeds: [embed] });
    }
};
