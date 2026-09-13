/**
 * Comando /reaction-roles - Crea un messaggio con ruoli assegnati via reazione (solo admin)
 *
 * L'admin specifica:
 * - Il canale dove inviare il messaggio
 * - Il titolo dell'embed
 * - Fino a 5 coppie emoji/ruolo
 *
 * Il bot invia l'embed, aggiunge automaticamente le reazioni e salva la
 * configurazione su MongoDB Cloud per la persistenza.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { addReactionRole } = require('../../misc/reactionRoles');

/**
 * Analizza la stringa di un'emoji ricevuta dall'input slash command
 * @param {string} input - Es. "🎮" oppure "<:custom:123456789>"
 * @returns {{ key: string, display: string }} key = chiave per il JSON, display = per l'embed
 */
function parseEmoji(input) {
  const trimmed = input.trim();

  // Custom emoji: <:name:id> oppure <a:name:id> (animated)
  const customMatch = trimmed.match(/^<a?:([\w]+):(\d+)>$/);
  if (customMatch) {
    return {
      key: customMatch[2],     // ID numerico → chiave nel JSON e in handleReactionAdd
      display: trimmed,        // <:name:id> → visualizzato nell'embed
    };
  }

  // Unicode emoji (o qualsiasi altro testo)
  return {
    key: trimmed,
    display: trimmed,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reaction-roles')
    .setDescription('Crea un messaggio con ruoli assegnabili tramite reazione (SOLO ADMIN)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // Canale di destinazione
    .addChannelOption(opt =>
      opt.setName('canale')
        .setDescription('Canale dove inviare il messaggio')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    // Titolo dell'embed
    .addStringOption(opt =>
      opt.setName('titolo')
        .setDescription('Titolo del messaggio embed')
        .setRequired(true)
    )
    // Coppia 1 (obbligatoria)
    .addStringOption(opt =>
      opt.setName('emoji1')
        .setDescription('Prima emoji (es. 🎮 oppure <:custom:id>)')
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('ruolo1')
        .setDescription('Ruolo da assegnare per la prima emoji')
        .setRequired(true)
    )
    // Coppia 2
    .addStringOption(opt =>
      opt.setName('emoji2')
        .setDescription('Seconda emoji (opzionale)')
    )
    .addRoleOption(opt =>
      opt.setName('ruolo2')
        .setDescription('Ruolo da assegnare per la seconda emoji')
    )
    // Coppia 3
    .addStringOption(opt =>
      opt.setName('emoji3')
        .setDescription('Terza emoji (opzionale)')
    )
    .addRoleOption(opt =>
      opt.setName('ruolo3')
        .setDescription('Ruolo da assegnare per la terza emoji')
    )
    // Coppia 4
    .addStringOption(opt =>
      opt.setName('emoji4')
        .setDescription('Quarta emoji (opzionale)')
    )
    .addRoleOption(opt =>
      opt.setName('ruolo4')
        .setDescription('Ruolo da assegnare per la quarta emoji')
    )
    // Coppia 5
    .addStringOption(opt =>
      opt.setName('emoji5')
        .setDescription('Quinta emoji (opzionale)')
    )
    .addRoleOption(opt =>
      opt.setName('ruolo5')
        .setDescription('Ruolo da assegnare per la quinta emoji')
    )
    // Coppia 6
    .addStringOption(opt =>
      opt.setName('emoji6')
        .setDescription('Sesta emoji (opzionale)')
    )
    .addRoleOption(opt =>
      opt.setName('ruolo6')
        .setDescription('Ruolo da assegnare per la sesta emoji')
    )
    // Coppia 7
    .addStringOption(opt =>
      opt.setName('emoji7')
        .setDescription('Settima emoji (opzionale)')
    )
    .addRoleOption(opt =>
      opt.setName('ruolo7')
        .setDescription('Ruolo da assegnare per la settima emoji')
    )
    // Coppia 8
    .addStringOption(opt =>
      opt.setName('emoji8')
        .setDescription('Ottava emoji (opzionale)')
    )
    .addRoleOption(opt =>
      opt.setName('ruolo8')
        .setDescription('Ruolo da assegnare per l\'ottava emoji')
    )
    // Coppia 9
    .addStringOption(opt =>
      opt.setName('emoji9')
        .setDescription('Nona emoji (opzionale)')
    )
    .addRoleOption(opt =>
      opt.setName('ruolo9')
        .setDescription('Ruolo da assegnare per la nona emoji')
    )
    // Coppia 10
    .addStringOption(opt =>
      opt.setName('emoji10')
        .setDescription('Decima emoji (opzionale)')
    )
    .addRoleOption(opt =>
      opt.setName('ruolo10')
        .setDescription('Ruolo da assegnare per la decima emoji')
    ),

  async execute(interaction) {
    // Verifica permessi (doppia protezione oltre a setDefaultMemberPermissions)
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Solo gli amministratori possono usare questo comando.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('canale');
    const titolo = interaction.options.getString('titolo');

    // Raccoglie le coppie emoji/ruolo valide (emoji E ruolo entrambi presenti)
    const pairs = [];
    for (let i = 1; i <= 10; i++) {
      const emojiInput = interaction.options.getString(`emoji${i}`);
      const role = interaction.options.getRole(`ruolo${i}`);

      if (!emojiInput && !role) continue;

      // Segnala se solo uno dei due è stato fornito
      if (emojiInput && !role) {
        return interaction.reply({ content: `❌ Hai inserito emoji${i} ma non ruolo${i}. Completa la coppia.`, ephemeral: true });
      }
      if (!emojiInput && role) {
        return interaction.reply({ content: `❌ Hai inserito ruolo${i} ma non emoji${i}. Completa la coppia.`, ephemeral: true });
      }

      // Controlla emoji duplicati
      const parsed = parseEmoji(emojiInput);
      if (pairs.some(p => p.emoji.key === parsed.key)) {
        return interaction.reply({ content: `❌ L'emoji "${parsed.display}" è stata inserita più volte.`, ephemeral: true });
      }

      // Controlla ruoli duplicati
      if (pairs.some(p => p.role.id === role.id)) {
        return interaction.reply({ content: `❌ Il ruolo <@&${role.id}> è stato assegnato a più emoji.`, ephemeral: true });
      }

      pairs.push({ emoji: parsed, role });
    }

    if (pairs.length === 0) {
      return interaction.reply({ content: '❌ Devi specificare almeno una coppia emoji/ruolo.', ephemeral: true });
    }

    // Deferisce la risposta poiché l'invio dell'embed, le reazioni e il salvataggio su Sheets superano i 3 secondi di timeout
    await interaction.deferReply({ ephemeral: true });

    // Costruisce la descrizione dell'embed con le coppie
    const descriptionLines = pairs.map(p => `${p.emoji.display} → <@&${p.role.id}>`);
    const description = [
      'Reagisci con le emoji qui sotto per ricevere il ruolo corrispondente.',
      'Rimuovi la reazione per perdere il ruolo.',
      '',
      ...descriptionLines,
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(titolo)
      .setDescription(description)
      .setFooter({ text: `Configurato da ${interaction.user.tag}` })
      .setTimestamp();

    // Invia il messaggio nel canale scelto
    let sentMessage;
    try {
      sentMessage = await channel.send({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply({
        content: `❌ Non ho potuto inviare il messaggio in <#${channel.id}>.\nAssicurati che il bot abbia i permessi di scrittura in quel canale.\n\`${err.message}\``,
      });
    }

    // Aggiunge le reazioni al messaggio in sequenza
    let reactErrors = 0;
    for (const pair of pairs) {
      try {
        await sentMessage.react(pair.emoji.display);
      } catch (err) {
        reactErrors++;
        console.error(`❌ Impossibile aggiungere la reazione "${pair.emoji.display}":`, err.message);
      }
    }

    // Salva la configurazione nel JSON (include il titolo per identificare il messaggio in seguito)
    const emojiRoleMap = {};
    pairs.forEach(p => { emojiRoleMap[p.emoji.key] = p.role.id; });
    await addReactionRole(interaction.guildId, channel.id, sentMessage.id, emojiRoleMap, titolo);

    // Risposta di conferma
    let confirmText = `✅ Messaggio reaction-roles creato in <#${channel.id}> con **${pairs.length}** coppi${pairs.length === 1 ? 'a' : 'e'} emoji/ruolo.\n💡 *Suggerimento: puoi aggiungere ulteriori coppie emoji/ruolo a questo messaggio in qualsiasi momento usando il comando \`/reaction-roles-add\`.*`;
    if (reactErrors > 0) {
      confirmText += `\n⚠️ ${reactErrors} reazion${reactErrors === 1 ? 'e non aggiunta' : 'i non aggiunte'} (emoji non valide o bot senza permessi).`;
    }

    await interaction.editReply({ content: confirmText });
  },
};
