/**
 * Comando /invita - Link invito server (solo admin)
 *
 * Recupera o genera dinamicamente il link di invito per il server.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig } = require('../../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invita')
    .setDescription('Ottieni il link di invito per il server (SOLO ADMIN)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply();

    const guildConfig = await getGuildConfig(interaction.guildId);
    let inviteLink = guildConfig.inviteLink || '';

    // Se non è stato impostato un link manuale, tenta di generarne/recuperarne uno automaticamente da Discord
    if (!inviteLink) {
      try {
        const invites = await interaction.guild.invites.fetch().catch(() => null);
        const existingInvite = invites ? invites.find((inv) => !inv.expiresAt && !inv.maxUses) : null;

        if (existingInvite) {
          inviteLink = existingInvite.url;
        } else if (interaction.channel && interaction.channel.createInvite) {
          const newInvite = await interaction.channel.createInvite({
            maxAge: 0, // Illimitato
            maxUses: 0, // Illimitato
            unique: false,
            reason: 'Link invito generato automaticamente da /invita',
          });
          inviteLink = newInvite.url;
        }
      } catch (err) {
        console.warn(`⚠️ Impossibile generare automaticamente l'invito per [${interaction.guildId}]:`, err.message);
      }
    }

    // Se il link è disponibile, mostra l'embed con il pulsante ed il link
    if (inviteLink) {
      const inviteEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('Invito al server 🎉')
        .setDescription('Vuoi invitare i tuoi amici? Usa il link qui sotto per farli entrare!')
        .addFields({
          name: '🔗 Link di invito:',
          value: `[Clicca qui per unirti!](${inviteLink})\n${inviteLink}`,
        })
        .setFooter({ text: 'Non vediamo l\'ora di vederti nel server!', iconURL: interaction.guild.iconURL() });

      return interaction.editReply({ embeds: [inviteEmbed] });
    }

    // Se il link non è disponibile e non può essere generato
    const errorEmbed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('Link di invito non disponibile ⚠️')
      .setDescription(
        'Impossibile generare o recuperare il link di invito per questo server.\n\n' +
        '**Come risolvere:**\n' +
        '1. Assicurati che il bot abbia il permesso **"Crea invito"** nel canale.\n' +
        '2. Oppure imposta un link manuale tramite il comando `/set inviteLink <url>` o dalla **Web Dashboard**.'
      )
      .setFooter({ text: 'JARVIS System', iconURL: interaction.guild.iconURL() });

    await interaction.editReply({ embeds: [errorEmbed] });
  },
};
