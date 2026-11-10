/**
 * Comando /userinfo - Informazioni utente
 *
 * Mostra informazioni dettagliate su un utente del server:
 * data di creazione account, ingresso nel server, ruoli.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Mostra informazioni sull\'utente')
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('utente')
        .setDescription('Seleziona un utente (opzionale)')
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Questo comando può essere usato solo all\'interno di un server.', ephemeral: true });
    }

    // Ottieni l'utente selezionato o chi ha eseguito il comando
    const targetUser = interaction.options.getUser('utente') || interaction.user;
    const member = interaction.guild.members.cache.get(targetUser.id) || (await interaction.guild.members.fetch(targetUser.id).catch(() => null));

    // Formatta i ruoli dell'utente come menzioni con protezione per lunghezza massima campo embed
    let roles = 'Nessun ruolo';
    if (member && member.roles && member.roles.cache) {
      const roleMentions = member.roles.cache
        .filter(role => role.name !== '@everyone')
        .map(role => `<@&${role.id}>`)
        .join(', ');
      if (roleMentions) {
        roles = roleMentions.length > 1000 ? roleMentions.substring(0, 995) + '...' : roleMentions;
      }
    } else {
      roles = 'Utente non presente in questo server';
    }

    // Timestamp formattati per Discord
    const accountCreatedTimestamp = targetUser.createdAt
      ? `<t:${Math.floor(targetUser.createdAt.getTime() / 1000)}:R>`
      : 'Non disponibile';
    const serverJoinedTimestamp = member && member.joinedAt
      ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`
      : 'Non disponibile';

    // Crea l'embed con le informazioni dell'utente
    const userInfoEmbed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`Informazioni su ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 1024 }))
      .addFields(
        { name: ':calendar: Da quanto tempo ha creato l\'account:', value: accountCreatedTimestamp, inline: true },
        { name: ':calendar: Da quanto tempo è nel server:', value: serverJoinedTimestamp, inline: true },
        { name: ':id: ID Utente:', value: targetUser.id, inline: true },
        { name: ':people_hugging: Ruoli:', value: roles, inline: false }
      )
      .setFooter({
        text: `Richiesto da ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    await interaction.reply({ embeds: [userInfoEmbed] });
  },
};
