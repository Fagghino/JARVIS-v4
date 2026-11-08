/**
 * Configurazione centralizzata globale del bot JARVIS (Multi-Server)
 *
 * Le configurazioni specifiche di ciascun server Discord (canali, ruoli, contatori, link di invito)
 * sono salvate in modo indipendente sul database MongoDB Cloud ed impostabili dagli amministratori tramite
 * la Web Dashboard o il comando /set senza mai accedere direttamente al database.
 */

module.exports = {
  // Impostazioni predefinite per nuovi server (impostabili dagli admin tramite /set o Dashboard)
  serverId: '',
  inviteLink: '',
  usersChannelId: '',
  botsChannelId: '',
  totalChannelId: '',
  welcomeChannelId: '',
  goodbyeChannelId: '',
  welcomeMessageText: 'Benvenuto nel server, {user}! Ora siamo in {count} membri!',
  goodbyeMessageText: '{user} ha lasciato il server. Ci mancherai!',
  levelUpChannelId: '',
  newMemberRoleId: '',
  botRoleId: '',
  botNickname: '',
  features: {
    xpEnabled: true,
    welcomeEnabled: true,
    reactionRolesEnabled: true,
    counterEnabled: true
  },
  commands: {
    flip: true,
    ping: true,
    roll: true,
    serverinfo: true,
    userinfo: true
  }
};
