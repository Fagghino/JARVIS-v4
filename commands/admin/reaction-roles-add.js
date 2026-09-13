/**
 * Comando /reaction-roles-add - Aggiunge una coppia emoji/ruolo a un messaggio esistente (solo admin)
 *
 * Il titolo del messaggio viene selezionato tramite autocomplete (lista dai messaggi
 * reaction-role già configurati nel server). Il bot aggiunge la nuova reazione al
 * messaggio e aggiorna la configurazione su MongoDB Cloud.
 */

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const {
  getReactionRoleByTitle,
  getTitlesForGuild,
  addEmojiRoleToMessage,
} = require('../../misc/reactionRoles');

/**
 * Analizza la stringa di un'emoji (uguale alla funzione in reaction-roles.js)
 * @param {string} input
 * @returns {{ key: string, display: string }}
 */
function parseEmoji(input) {
  const trimmed = input.trim();
  const customMatch = trimmed.match(/^<a?:([\w]+):(\d+)>$/);
  if (customMatch) {
    return { key: customMatch[2], display: trimmed };
  }
  return { key: trimmed, display: trimmed };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reaction-roles-add')
    .setDescription('Aggiunge una coppia emoji/ruolo a un messaggio reaction-role esistente (SOLO ADMIN)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('titolo')
        .setDescription('Titolo del messaggio reaction-role da modificare')
        .setRequired(true)
        .setAutocomplete(true)   // Mostra la lista dei messaggi esistenti
    )
    .addStringOption(opt =>
      opt.setName('emoji')
        .setDescription('Nuova emoji da aggiungere (es. 🎮 oppure <:custom:id>)')
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('ruolo')
        .setDescription('Ruolo da assegnare per questa emoji')
        .setRequired(true)
    ),

  /**
   * Autocomplete: restituisce i titoli dei messaggi reaction-role del server
   */
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const titles = await getTitlesForGuild(interaction.guildId);

    // Filtra in base a quanto scritto finora e limita a 25 risultati (limite Discord)
    const filtered = titles
      .filter(t => t.toLowerCase().includes(focused))
      .slice(0, 25)
      .map(t => ({ name: t, value: t }));

    await interaction.respond(filtered);
  },

  /**
   * Esecuzione del comando
   */
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Solo gli amministratori possono usare questo comando.', ephemeral: true });
    }

    const titolo = interaction.options.getString('titolo');
    const emojiInput = interaction.options.getString('emoji');
    const role = interaction.options.getRole('ruolo');

    // Cerca il messaggio reaction-role per titolo
    const config = await getReactionRoleByTitle(interaction.guildId, titolo);
    if (!config) {
      return interaction.reply({
        content: `❌ Nessun messaggio reaction-role trovato con il titolo **"${titolo}"**.\nUsa il menu di autocomplete per vedere i titoli disponibili.`,
        ephemeral: true,
      });
    }

    const emoji = parseEmoji(emojiInput);

    // Controlla che l'emoji non sia già presente
    if (config.roles[emoji.key]) {
      return interaction.reply({
        content: `❌ L'emoji **${emoji.display}** è già configurata su questo messaggio (ruolo: <@&${config.roles[emoji.key]}>).`,
        ephemeral: true,
      });
    }

    // Controlla che il ruolo non sia già assegnato a un'altra emoji
    const existingEmoji = Object.entries(config.roles).find(([, rId]) => rId === role.id);
    if (existingEmoji) {
      return interaction.reply({
        content: `❌ Il ruolo <@&${role.id}> è già assegnato all'emoji **${existingEmoji[0]}** su questo messaggio.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // Recupera il canale e il messaggio da Discord
    let targetChannel;
    try {
      targetChannel = await interaction.guild.channels.fetch(config.channelId);
    } catch {
      return interaction.editReply({ content: `❌ Impossibile trovare il canale <#${config.channelId}>. È stato eliminato?` });
    }

    let targetMessage;
    try {
      targetMessage = await targetChannel.messages.fetch(config.messageId);
    } catch {
      return interaction.editReply({
        content: `❌ Impossibile trovare il messaggio nel canale <#${config.channelId}>. È stato eliminato?\nSe sì, usa \`/reaction-roles\` per ricrearlo.`,
      });
    }

    // Aggiunge la reazione al messaggio
    try {
      await targetMessage.react(emoji.display);
    } catch (err) {
      return interaction.editReply({
        content: `❌ Impossibile aggiungere la reazione **${emoji.display}**.\nAssicurati che l'emoji esista e che il bot abbia i permessi per reagire.\n\`${err.message}\``,
      });
    }

    // Aggiorna il JSON
    await addEmojiRoleToMessage(config.channelId, config.messageId, emoji.key, role.id);

    // Aggiorna la descrizione dell'embed:
    // prende le righe esistenti (header + coppie già presenti) e aggiunge la nuova
    const oldEmbed = targetMessage.embeds[0];
    const oldDescription = oldEmbed?.description ?? '';

    // Separa l'header fisso dalle righe delle coppie emoji/ruolo
    const headerLines = [
      'Reagisci con le emoji qui sotto per ricevere il ruolo corrispondente.',
      'Rimuovi la reazione per perdere il ruolo.',
      '',
    ];
    const newLine = `${emoji.display} → <@&${role.id}>`;
    const newDescription = [...headerLines, ...oldDescription
      .split('\n')
      .filter(line => line.includes('→')),   // mantiene solo le righe coppie esistenti
      newLine,
    ].join('\n');

    const updatedEmbed = EmbedBuilder.from(oldEmbed).setDescription(newDescription);

    try {
      await targetMessage.edit({ embeds: [updatedEmbed] });
    } catch (err) {
      console.error('❌ Impossibile aggiornare l\'embed:', err.message);
      // Non blocchiamo: la reazione e il JSON sono già stati aggiornati
    }

    await interaction.editReply({
      content: `✅ Aggiunta la coppia **${emoji.display}** → <@&${role.id}> al messaggio **"${titolo}"** in <#${config.channelId}>.`,
    });
  },
};
