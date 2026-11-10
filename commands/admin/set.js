/**
 * Comando /set - Configurazione dinamica del bot (Multi-Server)
 *
 * Permette agli amministratori di modificare la configurazione del bot per il proprio server
 * selezionando canali e ruoli tramite menu interattivi. Le modifiche vengono salvate su MongoDB Cloud.
 */

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { updateGuildConfig } = require('../../utils/guildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set')
        .setDescription('Imposta un canale o un ruolo per questo server (SOLO ADMIN)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: '❌ Questo comando può essere usato solo all\'interno di un server.', ephemeral: true });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Solo gli amministratori possono eseguire questo comando.', ephemeral: true });
        }

        const options = [
            { label: 'Counter: Users Channel', value: 'usersChannelId' },
            { label: 'Counter: Bots Channel', value: 'botsChannelId' },
            { label: 'Counter: Total Channel', value: 'totalChannelId' },
            { label: 'Welcome Channel', value: 'welcomeChannelId' },
            { label: 'Goodbye Channel', value: 'goodbyeChannelId' },
            { label: 'New Member Role', value: 'newMemberRoleId' },
            { label: 'New Bot Role', value: 'botRoleId' },
            { label: 'LevelUp Channel', value: 'levelUpChannelId' }
        ];

        const typeSelect = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`select_type_${interaction.id}`)
                    .setPlaceholder('Seleziona cosa vuoi configurare per questo server')
                    .addOptions(options)
            );

        await interaction.reply({ content: 'Scegli cosa vuoi configurare:', components: [typeSelect], ephemeral: true });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async (i) => {
            if (i.customId === `select_type_${interaction.id}`) {
                const selectedType = i.values[0];
                let component;

                if (selectedType.includes('Role')) {
                    component = new ActionRowBuilder()
                        .addComponents(
                            new RoleSelectMenuBuilder()
                                .setCustomId(`select_role_${selectedType}`)
                                .setPlaceholder('Seleziona un ruolo')
                        );
                } else {
                    component = new ActionRowBuilder()
                        .addComponents(
                            new ChannelSelectMenuBuilder()
                                .setCustomId(`select_channel_${selectedType}`)
                                .setPlaceholder('Seleziona un canale')
                                .setChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
                        );
                }

                await i.update({ content: `Ora seleziona un ${selectedType.includes('Role') ? 'ruolo' : 'canale'} per **${selectedType}**:`, components: [component] });
            } else if (i.customId.startsWith('select_channel_') || i.customId.startsWith('select_role_')) {
                const selectedType = i.customId.replace('select_channel_', '').replace('select_role_', '');
                const selectedValue = i.values[0];

                await updateGuildConfig(interaction.guildId, { [selectedType]: selectedValue });

                await i.update({ content: `✅ ${selectedType.includes('Role') ? 'Ruolo' : 'Canale'} impostato con successo per **${selectedType}** su questo server!`, components: [] });
                collector.stop();
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                try {
                    await interaction.followUp({ content: '❌ Tempo scaduto per la selezione. Riprova il comando.', ephemeral: true });
                } catch (error) {}
            }
        });
    }
};
