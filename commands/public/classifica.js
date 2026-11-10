/**
 * Comando /classifica - Leaderboard XP del server (Multi-Server)
 *
 * Mostra la classifica degli utenti del server ordinati per XP con navigazione paginata.
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const UserXPModel = require('../../models/UserXP.js');
const { isDBConnected } = require('../../misc/database.js');
const { loadXPData } = require('../../misc/level.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('classifica')
    .setDescription('Mostra la classifica dei membri di questo server')
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Questo comando può essere usato solo in un server.', ephemeral: true });
    }

    await interaction.deferReply();

    // Query indicizzata su MongoDB ({ guildId: 1, xp: -1 }) limitata ai primi 100 utenti
    let leaderboard = [];

    if (isDBConnected() && UserXPModel) {
      const topDocs = await UserXPModel.find({ guildId: interaction.guildId })
        .sort({ xp: -1 })
        .limit(100)
        .lean();

      leaderboard = topDocs.map(doc => ({
        userID: doc.userId,
        username: doc.username || 'Unknown',
        xp: doc.xp || 0,
        level: doc.level || 0,
      }));
    } else {
      const xpData = await loadXPData(interaction.guildId);
      leaderboard = Object.keys(xpData)
        .map(userID => ({
          userID,
          username: xpData[userID]?.username || 'Unknown',
          xp: xpData[userID]?.xp || 0,
          level: xpData[userID]?.level || 0,
        }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 100);
    }

    if (leaderboard.length === 0) {
      return interaction.editReply({ content: '📊 Nessun utente ha ancora accumulato XP in questo server.' });
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(leaderboard.length / itemsPerPage);

    function createEmbed(page) {
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const pageData = leaderboard.slice(start, end);

      const serverIcon = interaction.guild.iconURL({ extension: 'png' }) || interaction.client.user.displayAvatarURL();

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `📋 Leaderboard XP - ${interaction.guild.name}`,
          iconURL: serverIcon
        })
        .setColor(0x3498db)
        .setDescription(pageData.map((entry, index) => {
          return `**#${start + index + 1} |** <@${entry.userID}> **- XP:** \`\`${entry.xp}\`\` **| Livello:** \`\`${entry.level}\`\``;
        }).join('\n'))
        .setFooter({ text: `Pagina ${page} di ${totalPages}` });

      return embed;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('Pagina Precedente')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Pagina Successiva')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(totalPages <= 1)
    );

    const message = await interaction.editReply({
      embeds: [createEmbed(1)],
      components: [row]
    });

    let currentPage = 1;

    const collector = message.createMessageComponentCollector({
      time: 60000,
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({ content: 'Questo bottone non è per te!', ephemeral: true });
      }

      if (buttonInteraction.customId === 'next') {
        currentPage++;
      } else if (buttonInteraction.customId === 'prev') {
        currentPage--;
      }

      await buttonInteraction.update({
        embeds: [createEmbed(currentPage)],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('Pagina Precedente')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(currentPage === 1),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Pagina Successiva')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(currentPage === totalPages)
          )
        ]
      });
    });

    collector.on('end', async () => {
      try {
        await message.edit({
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Pagina Precedente')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Pagina Successiva')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
            )
          ]
        });
      } catch {}
    });
  }
};
