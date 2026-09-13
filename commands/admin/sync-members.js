/**
 * Comando /sync-members - Sincronizza membri del server con MongoDB Cloud (Multi-Server)
 *
 * Carica tutti i membri del server corrente e li sincronizza direttamente con MongoDB Atlas.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isDBConnected } = require('../../misc/database');
const UserXPModel = require('../../models/UserXP');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-members')
    .setDescription('Sincronizza tutti i membri di questo server con il database MongoDB (SOLO ADMIN)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Questo comando può essere usato solo in un server.', ephemeral: true });
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Solo gli amministratori possono eseguire questo comando.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const guild = interaction.guild;
      const guildId = guild.id;

      try {
        await guild.members.fetch({ time: 60000 });
      } catch (fetchError) {
        console.warn('⚠️ Timeout nel fetch completo dei membri, uso la cache');
      }

      const allMembers = guild.members.cache;
      let addedCount = 0;
      let existingCount = 0;

      if (isDBConnected() && UserXPModel) {
        const operations = [];

        for (const member of allMembers.values()) {
          if (member.user.bot) continue;

          const userId = member.id;
          const username = member.user.username;

          const exists = await UserXPModel.exists({ guildId, userId });
          if (!exists) addedCount++;
          else existingCount++;

          operations.push({
            updateOne: {
              filter: { guildId, userId },
              update: {
                $set: { username },
                $setOnInsert: { xp: 0, level: 0 }
              },
              upsert: true
            }
          });
        }

        if (operations.length > 0) {
          await UserXPModel.bulkWrite(operations);
        }
      }

      const botCount = allMembers.filter(m => m.user.bot).size;
      const responseMessage = `✅ **Sincronizzazione completata per "${guild.name}" su MongoDB Cloud!**\n\n` +
        `📊 **Statistiche:**\n` +
        `• Membri totali analizzati: **${allMembers.size}**\n` +
        `• Bot ignorati: **${botCount}**\n` +
        `• Nuovi membri aggiunti: **${addedCount}**\n` +
        `• Membri già presenti (username aggiornato): **${existingCount}**`;

      await interaction.editReply({ content: responseMessage });

    } catch (error) {
      console.error('Errore durante la sincronizzazione:', error);
      await interaction.editReply({
        content: `❌ Si è verificato un errore durante la sincronizzazione:\n\`\`\`${error.message}\`\`\``
      });
    }
  }
};
