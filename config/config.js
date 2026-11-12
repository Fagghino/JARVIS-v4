/**
 * Configurazione centralizzata globale del bot JARVIS (Multi-Server)
 *
 * Le configurazioni specifiche di ciascun server Discord (canali, ruoli, contatori, link di invito)
 * sono salvate in modo indipendente sul database MongoDB Cloud ed impostabili dagli amministratori tramite
 * la Web Dashboard o il comando /set senza mai accedere direttamente al database.
 */

module.exports = {
  // Impostazioni predefinite per nuovi server (impostabili dagli admin tramite /set o Dashboard)
  inviteLink: '',
  usersChannelId: '',
  botsChannelId: '',
  totalChannelId: '',
  welcomeChannelId: '',
  goodbyeChannelId: '',
  welcomeMessageText: 'Benvenuto nel server, {user}! Ora siamo in {count} membri!',
  goodbyeMessageText: '{user} ha lasciato il server. Ci mancherai!',
  levelUpChannelId: '',
  levelUpMessageText: 'Congratulazioni **{user}**! Hai raggiunto il **livello {level}**!',
  newMemberRoleId: '',
  botRoleId: '',
  botNickname: '',
  freeGamesChannelId: '',
  freeGamesRoleId: '',
  freeGamesFilter: {
    keepOnly: true,
    includeDlc: false
  },
  features: {
    xpEnabled: true,
    levelUpNotificationEnabled: true,
    welcomeEnabled: true,
    reactionRolesEnabled: true,
    counterEnabled: true,
    freeGamesEnabled: false
  },
  commands: {
    flip: true,
    ping: true,
    roll: true,
    serverinfo: true,
    userinfo: true
  }
};
