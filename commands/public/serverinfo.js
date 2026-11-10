/**
 * Comando /serverinfo - Informazioni sul server
 *
 * Mostra un embed con le statistiche del server:
 * ID, data di creazione, proprietario, conteggio membri e canali.
 */

const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  // Definizione del comando
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Mostra informazioni sul server')
    .setDMPermission(false),

  // Esecuzione del comando
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Questo comando può essere usato solo in un server.', ephemeral: true });
    }

    const { guild } = interaction; // Ottiene le informazioni del server
    const owner = await guild.fetchOwner(); // Ottiene il proprietario del server

    // Fetch dei membri per avere dati accurati (non solo dalla cache)
    await guild.members.fetch().catch(() => {});

    // Conta membri e bot
    const totalMembers = guild.memberCount; // Numero totale di membri (inclusi i bot)
    const humanMembers = guild.members.cache.filter(member => !member.user.bot).size; // Solo persone
    const botMembers = totalMembers - humanMembers; // Solo bot

    // Conta i canali tramite ChannelType enum
    const textChannels = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildVoice).size;
    const totalChannels = textChannels + voiceChannels; // Totale canali testuali e vocali

    // Calcola timestamp
    const createdTimestamp = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;

    // Crea l'embed
    const serverEmbed = new EmbedBuilder()
      .setColor(0x3498db)
      .setAuthor({
        name: guild.name,
        iconURL: guild.iconURL({ size: 1024 }) || null
      })
      .setThumbnail(guild.iconURL({ size: 1024 }) || null) // Icona del server in piccolo
      .addFields(
        { name: ':id: ID del server:', value: guild.id, inline: true },
        { name: ':calendar: Creato il:', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: ':crown: Posseduto da:', value: `<@${owner.id}>`, inline: false },
        {
          name: `:busts_in_silhouette: Membri (**${totalMembers}**):`,
          value: `Persone: **${humanMembers}** | Bot: **${botMembers}**`,
          inline: true
        },
        {
          name: `:speech_balloon: Canali: **${totalChannels}**`,
          value: `Testuali: **${textChannels}** | Vocali: **${voiceChannels}**`,
          inline: true
        }
      );

    // Risponde con l'embed
    await interaction.reply({ embeds: [serverEmbed] });
  },
};
