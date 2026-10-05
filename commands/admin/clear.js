/**
 * Comando /clear - Cancellazione messaggi in massa (solo admin)
 *
 * Permette agli amministratori di cancellare un numero specifico di messaggi
 * dal canale corrente (massimo 50 messaggi).
 */

const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Cancella un numero specifico di messaggi (SOLO ADMIN)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('Numero di messaggi da cancellare (tra 1 e 50)')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Verifica permessi di amministratore
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: 'Non hai il permesso di utilizzare questo comando.',
        ephemeral: true,
      });
    }

    const amount = interaction.options.getInteger('amount');

    // Valida il numero di messaggi
    if (amount < 1 || amount > 50) {
      return interaction.reply({
        content: 'Per favore, specifica un numero di messaggi da cancellare tra 1 e 50.',
        ephemeral: true,
      });
    }

    try {
      // Cancella i messaggi (ignora quelli più vecchi di 14 giorni)
      const deleted = await interaction.channel.bulkDelete(amount, true);

      // Risponde con messaggio di conferma che si auto-elimina (conteggio effettivo)
      const confirmationMessage = await interaction.reply({
        content: `Ho cancellato ${deleted.size} messaggi${deleted.size < amount ? ` (${amount - deleted.size} erano troppo vecchi per essere eliminati)` : ''}!`,
        fetchReply: true,
      });

      // Elimina il messaggio di conferma dopo 5 secondi
      setTimeout(() => confirmationMessage.delete().catch(() => {}), 5000);
    } catch (error) {
      console.error(error);
      interaction.reply({
        content: 'Si è verificato un errore durante la cancellazione dei messaggi.',
        ephemeral: true, // Messaggio visibile solo all'utente
      });
    }
  },
};
