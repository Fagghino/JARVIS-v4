<div align="center">
  <img src="assets/image/banner.png" alt="JARVIS Banner" width="100%" style="border-radius: 16px;" />
  <br/><br/>
  <img src="assets/image/avatar.gif" alt="JARVIS Avatar" width="140" height="140" style="border-radius: 50%; border: 4px solid #3498db; margin-top: -70px; box-shadow: 0 12px 36px rgba(0,0,0,0.6);" />
  <br/><br/>
  <h1>🤖 J.A.R.V.I.S. Bot Discord</h1>
  <p><b>La Suite Completa di Automazione Discord Multi-Server & Dashboard Web Interattiva</b></p>

  <p>
    <a href="https://github.com/Fagghino/JARVIS-v4"><img src="https://img.shields.io/badge/Versione-v4.5.4-blue?style=for-the-badge&logo=discord&logoColor=white" alt="Versione"></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-16.x%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"></a>
    <a href="https://discord.js.org/"><img src="https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js"></a>
    <a href="https://www.mongodb.com/cloud/atlas"><img src="https://img.shields.io/badge/Database-MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"></a>
    <a href="../LICENSE"><img src="https://img.shields.io/badge/Licenza-MIT-yellow?style=for-the-badge" alt="Licenza"></a>
  </p>

  <p>
    <a href="../README.md"><b>🇺🇸 Documentazione Inglese</b></a> • 
    <a href="README.it.md"><b>🇮🇹 Documentazione Italiana</b></a> • 
    <a href="CHANGELOG.it.md"><b>📜 Storico Cambiamenti (v4.5.4)</b></a>
  </p>
</div>

---

## 📌 Panoramica Completa del Sistema

**J.A.R.V.I.S.** è un ecosistema per Discord ed una Web Dashboard integrata con architettura **Multi-Server (Multi-Guild)** pronto per l'uso in produzione. Sviluppato in **Node.js**, **Discord.js v14**, **Express.js** e **MongoDB Atlas Cloud**, JARVIS offre un'automazione completa per qualsiasi server Discord: livellamento XP (sia da messaggi testuali che da permanenza nei canali vocali), contatori membri dinamici nei canali vocali, menu Reaction Roles avanzati con supporto ai Partials, strumenti di amministrazione, comandi d'intrattenimento e una Web Dashboard interattiva con login Discord OAuth2, selettore dei server, cambio tema Chiaro/Scuro e supporto multilingua (ITA/ENG).

---

## 🌟 Moduli & Funzionalità del Bot

### 🏆 1. Sistema Avanzato XP & Livellamento
- **XP Chat Testuale**: Ogni messaggio inviato nei canali testuali conferisce **+10 XP** (con protezione anti-spam).
- **XP Canali Vocali**: La permanenza nei canali vocali assegna **+5 XP ogni 30 secondi** a tutti gli utenti attivi (`handleVoiceXP`).
- **Formula Matematica del Livello**: I livelli vengono calcolati in modo dinamico con la formula:
  $$\text{Livello} = \lfloor 0.1 \times \sqrt{\text{XP}} \rfloor$$
- **Embed di Notifica Level-Up**: Invia messaggi embed personalizzati nel canale dedicato quando un utente supera una soglia di livello.
- **Cache in Memoria & Auto-Flush Cloud**: Gli aggiornamenti XP vengono gestiti in RAM (`xpCache`) e salvati periodicamente su MongoDB Atlas in batch, garantendo prestazioni elevate e riducendo il carico di rete.
- **Classifica Interattiva**: Visualizzazione della classifica globale o per-server sia su Discord (`/classifica`) che sulla Web Dashboard.

---

### 👋 2. Automazioni Benvenuto & Addio
- **Embed di Benvenuto Personalizzati**: Accoglie i nuovi membri con un embed azzurro (`0x3498db`) contenente la miniatura dell'avatar dell'utente, l'anzianità dell'account ed il contatore membri aggiornato.
- **Embed di Addio**: Notifica le uscite dei membri con un embed rosso dedicato (`0xe74c3c`).
- **Assegnazione Ruoli Automatica**: Assegna automaticamente i ruoli predefiniti all'ingresso, differenziando tra utenti umani e account bot (`newMemberRoleId` e `botRoleId`).

---

### 📊 3. Contatori Vocali Dinamici in Tempo Reale
- **Canali Vocali Auto-Aggiornati**: Crea e rinomina automaticamente canali vocali dedicati per mostrare:
  1. 👥 **Membri Totali del Server** (`totalChannelId`)
  2. 👤 **Utenti Umani** (`usersChannelId`)
  3. 🤖 **Bot** (`botsChannelId`)
- **Protezione Anti-Rate-Limit**: Aggiorna i nomi dei canali ogni 10 minuti con una coda sequenziale per rispettare i limiti API di Discord (max 2 rinomine ogni 10 minuti per canale).

---

### 🎭 4. Motore Reaction Roles
- **Wizard di Creazione Guidata**: Configurazione rapida dei menu ruoli tramite i comandi `/reaction-roles` e `/reaction-roles-add`.
- **Supporto Multi-Coppia**: Gestisce fino a 10 coppie emoji-ruolo per messaggio con supporto ad emoji Unicode e custom emoji Discord.
- **Supporto ai Partials**: Utilizza i Partials di Discord.js (`Message`, `Channel`, `Reaction`, `User`, `GuildMember`) per garantire che l'assegnazione e la rimozione dei ruoli via reazione funzioni sempre, anche dopo i riavvii del bot o per messaggi vecchi non presenti in RAM.
- **Persistenza Cloud**: Le associazioni emoji-ruolo e gli ID dei messaggi sono salvati permanentemente su MongoDB Cloud.

---

### 🛡️ 5. Strumenti di Amministrazione & Moderazione
- **`/clear [quantita]`**: Elimina da 1 a 50 messaggi in blocco nel canale verificando l'anzianità dei messaggi (limite 14 giorni API Discord).
- **`/embed [titolo] [testo]`**: Costruttore di messaggi embed personalizzati con titolo, descrizione, colore e footer.
- **`/set [chiave] [valore]`**: Configura i canali (benvenuto, addio, level-up, contatori) ed i ruoli predefiniti a runtime senza riavviare il bot.
- **`/sync-members`**: Sincronizza tutti i membri ed i ruoli del server con il database MongoDB Atlas.
- **`/invita`**: Genera o recupera il link di invito permanente del server con creazione dinamica di fallback.
- **`/sito`**: Mostra il link al sito web ufficiale e alla Web Dashboard con pulsante interattivo.
- **`/help_admin`**: Guida ai comandi riservati agli amministratori.

---

### 🌍 6. Comandi Utility & Mini-Giochi Pubblici
- **`/traduci [testo]`**: Traduzione istantanea di testi tramite DeepL API con fallback automatico a Google Translate API.
- **`/userinfo [utente]`**: Mostra informazioni dettagliate sul profilo (avatar, data iscrizione a Discord e al server, ruoli posseduti).
- **`/server`**: Visualizza le statistiche complete del server (proprietario, data di creazione, livello di boost, numero di canali).
- **`/ping`**: Misura la latenza reale in ms del WebSocket e delle API REST di Discord.
- **`/roll [facce]`**: Lancia un dado personalizzato a N facce (default 6 facce).
- **`/flip`**: Lancia una moneta restituendo casualmente *Testa* o *Croce*.
- **`/help`**: Guida interattiva ai comandi pubblici per l'utente.

---

### 🌐 7. Dashboard Web Express Interattiva
- **Login OAuth2 Discord**: Autenticazione sicura tramite l'API ufficiale di Discord.
- **Selettore Server (`/select-guild`)**: Mostra le card dei server gestiti abilita quelle in cui l'utente ha i permessi admin e sfoca con lucchetto `🔒 Admin permissions required` i server non autorizzati.
- **Selettore Tema (Chiaro / Scuro)**: Cambio tema grafico immediato con memoria su `localStorage`.
- **Selettore Lingua (ITA / ENG)**: Traduzione istantanea dell'intera interfaccia tra Italiano ed Inglese.
- **Gestione Live**: Monitoraggio in tempo reale di memoria RAM, uptime, ping WebSocket, classifica XP live e pannello di configurazione impostazioni per-server.

---

### ☁️ 8. Architettura Cloud Multi-Server
- **Persistenza MongoDB Atlas**: Dati isolati in modo indipendente per ogni `guildId` su MongoDB Cloud (`GuildSettings`, `UserXP`, `ReactionRole`).
- **Pronto per Render Free Tier**: Sicuro su filesystem epimeri/volatili — nessuna chiave o credenziale salvata in locale.
- **Keep-Alive UptimeRobot**: Totalmente compatibile con il pinging HTTP(s) ogni 5 minuti per evitare lo sleep dell'istanza.

---

## 🎮 Guida ai Comandi Slash

### 👤 Comandi Pubblici

| Comando | Descrizione | Uso / Dettagli |
| :--- | :--- | :--- |
| `/help` | Guida interattiva ai comandi | Panoramica comandi utente |
| `/classifica` | Classifica XP e livelli del server | Classifica paginata con livelli e punti XP |
| `/ping` | Verifica la latenza del bot e delle API | Latenza in millisecondi |
| `/userinfo` | Mostra dettagli sul profilo dell'utente | Avatar, data iscrizione, lista ruoli |
| `/server` | Visualizza le statistiche del server | Conteggio membri, livello boost, canali |
| `/roll` | Lancia un dado personalizzato a N facce | Es. `/roll 20` per un dado D20 |
| `/flip` | Lancia una moneta | Restituisce casualmente Testa o Croce |
| `/traduci` | Traduce istantaneamente un testo | Basato sulle API DeepL & Google Translate |

### 🛡️ Comandi Amministrativi

| Comando | Descrizione | Permessi Richiesti |
| :--- | :--- | :--- |
| `/help_admin` | Pannello d'aiuto per amministratori | Amministratore |
| `/clear` | Elimina da 1 a 50 messaggi in blocco | Amministratore |
| `/embed` | Crea ed invia un embed custom | Amministratore |
| `/set` | Configura canali e ruoli del server | Amministratore / Gestisci Server |
| `/invita` | Genera o recupera il link di invito | Amministratore |
| `/sito` | Mostra il link del sito web e della Web Dashboard | Amministratore |
| `/reaction-roles` | Wizard creazione menu Reaction Roles | Amministratore |
| `/reaction-roles-add` | Aggiunge coppie emoji-ruolo ad un menu | Amministratore |
| `/sync-members` | Sincronizza i membri del server con MongoDB | Amministratore |

---

## 📦 Requisiti

- **Node.js**: `16.x` o superiore
- **npm**: `8.x` o superiore
- **Applicazione Discord**: Bot Token & OAuth2 Client Secret dal [Discord Developer Portal](https://discord.com/developers/applications)
- **Database Cloud**: Istanza gratuita MongoDB Atlas (Piano `Free M0`)

---

## 🚀 Guida all'Installazione Locale

### 1. Clona il Repository
```bash
git clone https://github.com/Fagghino/JARVIS-v4.git
cd JARVIS-v4
```

### 2. Installa le Dipendenze
```bash
npm install
```

### 3. Configura le Variabili d'Ambiente
Copia il file modello presente in `config/.env.example` nel file `config/.env` ed inserisci le tue credenziali:

```env
# Credenziali Bot Discord & OAuth2 Application
DISCORD_TOKEN=tuo_token_bot_qui
DISCORD_CLIENT_ID=tuo_application_id_qui
DISCORD_CLIENT_SECRET=tuo_oauth2_client_secret_qui

# Configurazione Web Dashboard
REDIRECT_URI=http://localhost:8080/auth/callback
SESSION_SECRET=stringa_casuale_segreta_qui
ADMIN_ROLE_IDS=id_ruolo_admin_1,id_ruolo_admin_2
NODE_ENV=development

# Connessione Database MongoDB Atlas Cloud
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database_name>?retryWrites=true&w=majority
```

### 4. Registra i Comandi Slash Globali
```bash
npm run deploy
```

### 5. Avvia l'Applicazione
```bash
npm start
```

---

## ☁️ Deployment su Render Free Tier

1. **Crea il Servizio Web**: Collega il tuo repository GitHub su [Render.com](https://render.com).
2. **Imposta le Variabili d'Ambiente**: Aggiungi le 7 chiavi (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `REDIRECT_URI`, `SESSION_SECRET`, `ADMIN_ROLE_IDS`, `MONGODB_URI`) nella sezione Render *Environment Variables*.
3. **Abilita IP Whitelist su MongoDB**: Su MongoDB Atlas -> *Security* -> *Network Access*, aggiungi la regola `0.0.0.0/0` (Allow Access from Anywhere - Permanente).
4. **Configura Redirect OAuth2 Discord**: Nel Discord Developer Portal -> *OAuth2* -> *Redirects*, aggiungi `https://tua-app.onrender.com/auth/callback`.
5. **Keep-Alive UptimeRobot**: Crea un monitor HTTP(s) gratuito su [UptimeRobot.com](https://uptimerobot.com) verso `https://tua-app.onrender.com/` ogni 5 minuti per evitare lo sleep dell'istanza.

---

## 🗂️ Struttura del Progetto

```text
JARVIS-v4/
├── index.js                          # Punto di ingresso del bot & inizializzazione client
├── deploy-commands.js                # Script di registrazione globale dei comandi slash
├── package.json                      # Dipendenze e script npm del progetto
├── config/
│   ├── .env.example                  # Modello delle variabili d'ambiente
│   └── config.js                     # Configurazione globale e modelli predefiniti
├── models/                           # Schemi Mongoose (MongoDB Atlas)
│   ├── GuildSettings.js              # Schema delle impostazioni per ogni server
│   ├── ReactionRole.js               # Schema dei reaction roles e mappature emoji
│   └── UserXP.js                     # Schema di XP e livello degli utenti
├── dashboard/                        # Web Dashboard Express & Landing Page
│   ├── server.js                     # Server Express, OAuth2 Discord & API per-guild
│   ├── public/                       # Risorse statiche
│   │   ├── css/
│   │   │   ├── landing.css           # Foglio di stile dedicato per la landing page
│   │   │   └── style.css             # Foglio di stile CSS glassmorphism (Dark/Light)
│   │   ├── images/
│   │   │   ├── avatar.gif            # Avatar animato del bot
│   │   │   └── banner.png            # Banner ufficiale di testata ed hero
│   │   └── js/theme-lang.js          # Script frontend per cambio tema e lingua
│   └── views/                        # Template HTML5
│       ├── landing.html              # Pagina iniziale ufficiale con anteprima interattiva dei moduli
│       ├── login.html                # Pagina unificata di ingresso e login
│       ├── dashboard.html            # Vista principali con statistiche del bot
│       ├── select-guild.html         # Selettore server con controllo permessi
│       ├── leaderboard.html          # Classifica XP dinamica del server
│       ├── settings.html             # Pannello di configurazione admin per-server
│       └── unauthorized.html         # Pagina di accesso negato
├── commands/                         # Comandi Slash
│   ├── admin/                        # Comandi riservati agli amministratori
│   └── public/                       # Comandi pubblici per gli utenti
├── misc/                             # Moduli Operativi del Bot
│   ├── database.js                   # Modulo di connessione a MongoDB Atlas
│   ├── level.js                      # Tracciatore XP testo e voce con in-memory cache
│   ├── reactionRoles.js              # Gestore degli eventi di aggiunta/rimozione reazioni
│   ├── welcome.js                    # Notifiche embed per benvenuto ed addio membri
│   └── counter.js                    # Aggiornamento automatico contatori canali vocali
├── scripts/                          # Script di Utility e Migrazione
│   ├── migrateSheetsToMongo.js       # Migrazione dati storici (Google Sheets -> MongoDB)
│   └── clearGuildCommands.js         # Pulizia comandi duplicati di livello Guild
├── utils/                            # Utility Condivise
│   ├── cooldown.js                   # Gestore di rate limiting e cooldown utenti
│   ├── guildSettings.js              # Helper impostazioni server su MongoDB
│   ├── loadCommands.js               # Loader ricorsivo per i comandi slash
│   ├── logger.js                     # Logger strutturato con timestamp ISO
│   ├── parseEmoji.js                 # Parser condiviso per emoji Discord e unicode
│   └── translator.js                 # Wrapper per le API DeepL & Google Translate
└── Docs/                             # Documentazione di Progetto
    ├── README.it.md                  # Documentazione ufficiale in lingua italiana
    ├── CHANGELOG.en.md               # Changelog in lingua inglese
    └── CHANGELOG.it.md               # Changelog in lingua italiana
```

---

## 🔨 Script npm Disponibili

| Script | Comando | Scopo |
| :--- | :--- | :--- |
| `npm start` | `node index.js` | Avvia il bot e la Web Dashboard in produzione |
| `npm run dev` | `nodemon index.js` | Avvia in modalità sviluppo con ricaricamento automatico |
| `npm run web` | `node -e ...` | Avvia esclusivamente il server web del sito in locale (senza connettersi a Discord) |
| `npm run deploy` | `node deploy-commands.js` | Registra i comandi slash a livello globale su Discord |
| `npm run migrate` | `node scripts/migrateSheetsToMongo.js` | Migra i dati storici da Google Sheets a MongoDB |
| `npm run test` | `node --check ...` | Esegue il controllo sintattico su tutti i file del progetto |

---

## ❓ FAQ & Risoluzione Problemi

<details>
<summary><b>1. Errore MongoServerSelectionError / ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR su Render</b></summary>
<br/>
Questo accade quando MongoDB Atlas blocca le connessioni in ingresso dagli IP del cloud di Render. Su MongoDB Atlas -> <i>Security</i> -> <i>Network Access</i>, clicca su <b>+ Add IP Address</b>, seleziona <b>ALLOW ACCESS FROM ANYWHERE</b> (<code>0.0.0.0/0</code>), imposta su <b>Permanent</b> e clicca <b>Confirm</b>.
</details>

<details>
<summary><b>2. I comandi slash compaiono 2 volte su Discord</b></summary>
<br/>
Accade se in passato sono stati registrati sia i comandi specifici del server (Guild) che quelli Globali. Esegui <code>node scripts/clearGuildCommands.js &lt;guildId&gt;</code> per svuotare i comandi duplicati del server, poi riavvia l'app di Discord con <code>CTRL + R</code>.
</details>

<details>
<summary><b>3. Errore ERR_TOO_MANY_REDIRECTS sulla Web Dashboard</b></summary>
<br/>
Assicurati che la variabile d'ambiente <code>REDIRECT_URI</code> corrisponda esattamente all'URL del tuo servizio Render (es. <code>https://tua-app.onrender.com/auth/callback</code>) sia su Render che su Discord Developer Portal -> <i>OAuth2</i> -> <i>Redirects</i>.
</details>

---

<hr/>

<div align="center">
  <img src="assets/image/avatar.png" width="60" height="60" style="border-radius: 50%; opacity: 0.9;" />
  <br/><br/>
  <p><b>Bot Discord J.A.R.V.I.S. & Web Dashboard</b> • Creato con ❤️ da <a href="https://github.com/Fagghino"><b>Fagghino</b></a></p>
  <p>
    <a href="#top">⬆️ Torna in Alto</a> • 
    <a href="../LICENSE">📄 Licenza MIT</a> • 
    <a href="CHANGELOG.it.md">📜 Storico Cambiamenti (v4.5.4)</a>
  </p>
</div>
