/**
 * Comando /rank - Visualizza scheda livello e posizione in classifica (Multi-Server)
 *
 * Mostra livello, XP correnti, XP necessari al prossimo livello, barra di progresso
 * e posizione in classifica all'interno del server corrente.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserXPModel = require('../../models/UserXP.js');
const { isDBConnected } = require('../../misc/database.js');
const { loadXPData, getLevel, getNextLevelXP } = require('../../misc/level.js');
const { getGuildConfig } = require('../../utils/guildSettings.js');

function createProgressBar(percent, length = 12) {
  const p = Math.max(0, Math.min(1, percent));
  const filledCount = Math.round(p * length);
  const emptyCount = length - filledCount;
  return '█'.repeat(filledCount) + '░'.repeat(emptyCount);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Mostra la tua scheda livello, XP e posizione in classifica')
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('utente')
        .setDescription('Utente di cui visualizzare il livello (opzionale)')
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Questo comando può essere usato solo in un server.', ephemeral: true });
    }

    const guildConfig = await getGuildConfig(interaction.guildId);
    if (guildConfig.features && guildConfig.features.xpEnabled === false) {
      return interaction.reply({
        content: '⚠️ Il sistema XP e livelli è attualmente disattivato dagli amministratori su questo server.',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('utente') || interaction.user;
    if (targetUser.bot) {
      return interaction.editReply({ content: '🤖 I bot non guadagnano XP né scalano i livelli!' });
    }

    const guildId = interaction.guildId;
    const userId = targetUser.id;

    let xp = 0;
    let level = 0;
    let rankPosition = 'N/A';
    let totalRanked = 0;

    if (isDBConnected() && UserXPModel) {
      const doc = await UserXPModel.findOne({ guildId, userId }).lean();
      if (doc) {
        xp = doc.xp || 0;
        level = doc.level !== undefined ? doc.level : getLevel(xp);
      }

      // Posizione in classifica: conta quanti utenti hanno più XP su questo server
      const higherUsers = await UserXPModel.countDocuments({ guildId, xp: { $gt: xp } });
      rankPosition = higherUsers + 1;
      totalRanked = await UserXPModel.countDocuments({ guildId, xp: { $gt: 0 } });
    } else {
      const xpData = await loadXPData(guildId);
      const userData = xpData[userId] || { xp: 0, level: 0 };
      xp = userData.xp || 0;
      level = userData.level !== undefined ? userData.level : getLevel(xp);

      const allSorted = Object.entries(xpData)
        .map(([id, u]) => ({ id, xp: u.xp || 0 }))
        .sort((a, b) => b.xp - a.xp);

      const index = allSorted.findIndex(u => u.id === userId);
      rankPosition = index !== -1 ? index + 1 : 'N/A';
      totalRanked = allSorted.filter(u => u.xp > 0).length;
    }

    const currentLevelMinXP = Math.pow(level / 0.1, 2);
    const nextLevelXP = getNextLevelXP(xp);
    const xpIntoLevel = Math.max(0, xp - currentLevelMinXP);
    const xpNeededForLevel = Math.max(1, nextLevelXP - currentLevelMinXP);
    const progressPercent = Math.min(1, Math.max(0, xpIntoLevel / xpNeededForLevel));
    const progressBar = createProgressBar(progressPercent, 12);
    const percentageText = Math.floor(progressPercent * 100);

    const rankEmbed = new EmbedBuilder()
      .setColor(0x3498db)
      .setAuthor({
        name: `Scheda Livello • ${targetUser.username}`,
        iconURL: targetUser.displayAvatarURL()
      })
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '🏆 Posizione Server', value: `#${rankPosition} / ${totalRanked || 1}`, inline: true },
        { name: '⭐ Livello', value: `**${level}**`, inline: true },
        { name: '✨ XP Totali', value: `**${xp.toLocaleString()}**`, inline: true },
        {
          name: `📈 Progresso Livello ${level + 1}`,
          value: `\`${progressBar}\` **${percentageText}%**\n(${xp.toLocaleString()} / ${Math.floor(nextLevelXP).toLocaleString()} XP - mancano ${(Math.floor(nextLevelXP) - xp).toLocaleString()} XP)`,
          inline: false
        }
      )
      .setFooter({
        text: `Server: ${interaction.guild.name}`,
        iconURL: interaction.guild.iconURL() || interaction.client.user.displayAvatarURL()
      });

    await interaction.editReply({ embeds: [rankEmbed] });
  }
};

