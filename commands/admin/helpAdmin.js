/**
 * Comando /help_admin - Lista comandi amministratore
 *
 * Mostra un embed con tutti i comandi admin disponibili.
 * Filtra automaticamente solo i comandi nella cartella admin/.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help_admin')
    .setDescription('Mostra la lista dei comandi admin disponibili')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    const commands = interaction.client.commands;
    const adminCommandsPath = path.resolve(__dirname, '../admin');

    // Filtra solo i comandi nella cartella commands/admin
    const adminCommands = [...commands.values()].filter(cmd => {
      if (!cmd.filePath) return false;
      const relativePath = path.relative(adminCommandsPath, cmd.filePath);
      return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    });


    if (adminCommands.length === 0) {
      return interaction.reply({ content: 'Nessun comando admin disponibile.', ephemeral: true });
    }

    // Crea l'embed con la lista dei comandi admin
    const helpEmbed = new EmbedBuilder()
      .setAuthor({
        name: '🤖 Lista comandi Admin',
        iconURL: interaction.client.user?.displayAvatarURL() || null,
      })
      .setColor(0x3498db)
      .setDescription('Ecco la lista dei comandi admin disponibili e le loro descrizioni.');

    // Aggiungi ogni comando all'embed
    adminCommands.forEach((cmd) => {
      const description = cmd.data?.description || 'Nessuna descrizione';
      helpEmbed.addFields({ name: `**/${cmd.data.name}**`, value: description, inline: false });
    });

    await interaction.reply({ embeds: [helpEmbed] });
  },
};
