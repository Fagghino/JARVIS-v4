/**
 * Comando /ping - Test latenza bot
 *
 * Mostra la latenza del bot con un messaggio pong.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Mostra il ping')
    .setDMPermission(false),

  async execute(interaction) {
    // Ottiene la latenza reale del WebSocket Discord
    const ping = interaction.client.ws.ping;

    // Crea l'embed con il risultato
    const pingEmbed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('pong! :ping_pong:')
      .addFields(
        { name: ':hourglass: Ping:', value: `${ping}ms`, inline: true }
      );

    await interaction.reply({ embeds: [pingEmbed] });
  },
};
