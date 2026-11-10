/**
 * Comando /help - Lista comandi pubblici disponibili
 *
 * Mostra un embed con tutti i comandi pubblici disponibili per gli utenti.
 * Filtra automaticamente solo i comandi nella cartella public/.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra la lista dei comandi disponibili')
    .setDMPermission(false),

  async execute(interaction) {
    const commands = interaction.client.commands;
    const publicCommandsPath = path.resolve(__dirname, '../public');

    // Filtra solo i comandi nella cartella commands/public
    const publicCommands = commands.filter(cmd => {
      if (!cmd.filePath) return false;
      const relativePath = path.relative(publicCommandsPath, cmd.filePath);
      return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    });



    if (publicCommands.size === 0) {
      return interaction.reply({ content: 'Nessun comando disponibile.', ephemeral: true });
    }

    // Crea l'embed con la lista dei comandi
    const helpEmbed = new EmbedBuilder()
      .setAuthor({
        name: '🤖 Lista comandi',
        iconURL: interaction.client.user?.displayAvatarURL() || null,
      })
      .setColor(0x3498db)
      .setDescription('Ecco la lista dei comandi disponibili e le loro descrizioni.');

    // Aggiungi ogni comando all'embed
    publicCommands.forEach((cmd) => {
      const description = cmd.data?.description || 'Nessuna descrizione';
      helpEmbed.addFields({ name: `**/${cmd.data.name}**`, value: description, inline: false });
    });

    await interaction.reply({ embeds: [helpEmbed] });
  },
};
