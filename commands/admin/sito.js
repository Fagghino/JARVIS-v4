/**
 * Comando /sito - Link al sito web ufficiale e Web Dashboard di JARVIS (solo admin)
 *
 * Fornisce agli amministratori il link diretto alla Web Dashboard di JARVIS
 * per la gestione e configurazione del bot.
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');

const SITE_URL = process.env.SITE_URL || 'https://jarvis-v5-cto5.onrender.com/';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sito')
    .setDescription('Mostra il link del sito web e della Web Dashboard di JARVIS (SOLO ADMIN)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Verifica che il comando sia eseguito in un server
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Questo comando può essere usato solo all\'interno di un server.',
        ephemeral: true,
      });
    }

    // Verifica permessi di amministratore a runtime (doppia protezione)
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ Solo gli amministratori possono eseguire questo comando.',
        ephemeral: true,
      });
    }

    // Costruisce l'embed informativo con il link del sito
    const siteEmbed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🌐 Web Dashboard & Sito Ufficiale')
      .setDescription(
        'Accedi alla Web Dashboard di **JARVIS** per configurare le impostazioni del server, ' +
        'visualizzare le statistiche in tempo reale e consultare la classifica globale.'
      )
      .addFields({
        name: '🔗 Link diretto:',
        value: `[Clicca qui per accedere alla Dashboard](${SITE_URL})\n${SITE_URL}`,
      })
      .setFooter({
        text: 'JARVIS System • Web Dashboard',
        iconURL: interaction.client.user?.displayAvatarURL() || interaction.guild.iconURL(),
      });

    // Pulsante interattivo con link diretto
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Apri il Sito Web')
        .setURL(SITE_URL)
        .setStyle(ButtonStyle.Link)
        .setEmoji('🌐')
    );

    await interaction.reply({
      embeds: [siteEmbed],
      components: [row],
    });
  },
};

