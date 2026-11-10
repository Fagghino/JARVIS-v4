/**
 * Comando /traduci - Traduzione automatica
 *
 * Traduce automaticamente l'ultimo messaggio non-bot del canale in italiano.
 * Utilizza Google Translate API.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { translateText } = require('../../utils/translator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('traduci')
    .setDescription('Traduce l\'ultimo messaggio in italiano')
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      if (!interaction.channel) {
        return await interaction.editReply({ content: '❌ Canale non disponibile per la lettura dei messaggi.' });
      }

      // Recupera gli ultimi 10 messaggi e trova l'ultimo non-bot
      const messages = await interaction.channel.messages.fetch({ limit: 10 });
      const lastMessage = messages.find(msg => !msg.author.bot);

      if (!lastMessage) {
        return await interaction.editReply({ content: 'Non ho trovato messaggi recenti da tradurre.' });
      }

      const text = lastMessage.content;

      if (!text || text.trim().length === 0) {
        return await interaction.editReply({ content: 'L\'ultimo messaggio trovato non contiene testo traducibile.' });
      }

      // Traduce il testo in italiano usando il nostro modulo di traduzione
      const translatedText = await translateText(text, 'it');

      // Crea l'embed con la traduzione
      const embed = new EmbedBuilder()
        .setTitle('Traduzione:')
        .setDescription(translatedText)
        .setColor(0x3498db)
        .setFooter({ text: `Messaggio originale di ${lastMessage.author.tag}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Errore nella traduzione:', error);
      await interaction.editReply({ content: 'Si è verificato un errore nella traduzione del messaggio.' });
    }
  }
};
