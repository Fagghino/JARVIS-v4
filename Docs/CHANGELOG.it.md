# Changelog

Tutte le modifiche rilevanti a questo progetto saranno documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
e questo progetto aderisce al [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.5.4] - 2026-10-29

### Added
- **Comando Amministratore `/sito`**:
  - `commands/admin/sito.js`: Aggiunto comando slash riservato agli amministratori con verifica permessi (`PermissionFlagsBits.Administrator`), embed informativo e pulsante interattivo con link diretto alla Web Dashboard ufficiale su Render (`https://jarvis-v5-cto5.onrender.com/`).
- **Asset Grafici Web Dashboard**:
  - `dashboard/public/images/banner.png`: Integrato il banner ufficiale di JARVIS per l'header della dashboard web.

### Changed
- **Restyling Estetico Web Dashboard**:
  - `dashboard/public/css/style.css`: Aggiornata la combinazione cromatica dall'arancione/giallo (`#ff8c00`) alla palette sci-fi Arc Reactor Ciano & Azzurro (`#00b4d8`, `#38bdf8`, `#0077b6`, gradiente `linear-gradient(135deg, #00d2ff 0%, #0077b6 100%)`).
  - `dashboard/public/css/style.css`: Introdotta la classe `.banner-wrapper` con overlay a gradiente sfumato ed effetto header profilo Discord Nitro con avatar (`.avatar-container`) parzialmente sovrapposto al banner.
  - `dashboard/public/css/style.css`: Rinnovate le card di monitoraggio con micro-icone, transizioni morbide ed elevazione con bagliore neon al passaggio del mouse (`box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3), 0 0 18px rgba(0, 180, 216, 0.15)`).
  - `dashboard/public/css/style.css`: Ottimizzati i pulsanti d'azione con gradiente azzurro sci-fi e bagliori metallici per i podi della classifica (Oro, Argento, Ambra).
  - `dashboard/public/css/style.css`: Calibrati i contrasti, i bordi e l'overlay del banner per la modalità chiara (*Light Mode*).
  - `dashboard/views/dashboard.html`: Integrato il banner immersivo a tutto schermo e aggiunte micro-icone descrittive per ciascuna statistica (🌐 Web Server, 🤖 Connessione Discord, 🛡️ Server Attivi, ⚡ Uptime, 📶 Ping, 🧠 Memoria).
  - `dashboard/views/login.html`: Implementato l'header con banner anche nella schermata di login, coordinato con l'avatar animato del bot.
  - `dashboard/views/leaderboard.html`: Aggiornato lo spinner di caricamento e i dettagli visivi alla palette ciano/azzurra.
  - `dashboard/views/select-guild.html`: Convertite le ombre di elevazione delle card server attive al tema ciano.
  - `dashboard/views/settings.html`: Armonizzati gli spinner di caricamento e gli stili form con il tema ciano.

## [4.5.3] - 2026-10-05

### Security
- **Autenticazione Web Dashboard & Sessioni**:
  - `dashboard/server.js`: Rimosso il fallback hardcoded per il secret di sessione; `SESSION_SECRET` è ora obbligatorio e validato rigorosamente all'avvio.
  - `dashboard/server.js`: Aggiunta generazione crittografica, salvataggio in sessione e validazione del parametro `state` nel flusso di login OAuth2 di Discord (`/auth/login` e `/auth/callback`) per prevenire attacchi CSRF.
  - `dashboard/server.js`: Rafforzata la sicurezza dei cookie di sessione con `httpOnly: true` e `sameSite: 'lax'` per mitigare l'accesso da script client-side e il cross-site request forgery.
- **Controllo Accessi & Autorizzazione API**:
  - `dashboard/server.js`: Implementato middleware `ensureGuildAdminApi` su `GET /api/settings/:guildId` per limitare l'accesso alla configurazione esclusivamente agli amministratori e proprietari del server.
  - `dashboard/server.js`: Implementato middleware `ensureGuildMemberApi` su `GET /api/leaderboard/:guildId` per verificare l'effettiva appartenenza al server direttamente tramite la cache guild di Discord, respingendo utenti non membri con errore 403 Forbidden.
- **Intestazioni HTTP & Protezione del Traffico**:
  - `dashboard/server.js`: Integrato middleware `helmet` con Content Security Policy (CSP) calibrata per consentire script e stili inline necessari oltre alle risorse CDN di Discord.
  - `dashboard/server.js`: Integrato `express-rate-limit` per limitare le richieste brute-force su rotte auth (`/auth/*`, 10 req/15 min) e API (`/api/*`, 60 req/min).
  - `dashboard/server.js`: Aggiunto middleware per verificare obbligatoriamente `Content-Type: application/json` su tutte le chiamate `POST /api/*`.
  - `dashboard/server.js`: Imposto limite alla dimensione del body (`express.json({ limit: '10kb' })`) per prevenire flood di payload e consumo anomalo di memoria.
  - `dashboard/server.js`: Implementata whitelist rigorosa dei campi consentiti in `POST /api/settings/:guildId` per eliminare vulnerabilità di Mass Assignment.
- **Sanitizzazione XSS & Template Engine**:
  - `dashboard/server.js`: Creata ed esportata la funzione di utilità `escapeHtml`, applicandola sistematicamente in `renderTemplate`, `getUserBarHtml` e su tutte le variabili dinamiche iniettate nei template (`user.username`, `bg.name`, `guildName`, `req.guild.name`).
  - `dashboard/views/leaderboard.html`: Sostituita l'interpolazione `innerHTML` con assegnazione sicura `textContent` per gli username degli utenti nella classifica contro DOM-based XSS.
- **Permessi Comandi Slash Discord**:
  - `commands/admin/clear.js`: Aggiunto `.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)` per nascondere il comando `/clear` nell'interfaccia client di Discord agli utenti senza privilegi amministrativi.

### Fixed
- **Avvio del Bot & Connessione Database**:
  - `index.js`: Anticipata la validazione delle variabili d'ambiente (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `MONGODB_URI`, `SESSION_SECRET`) come primissima istruzione dopo `dotenv.config()`, bloccando l'avvio parziale in caso di parametri mancanti.
  - `index.js`: Incapsulati connessione database, avvio dashboard e login Discord in una IIFE asincrona (`await connectDB()`), garantendo che MongoDB sia connesso prima dell'ascolto di eventi o esecuzione di comandi.
- **Gestione Errori di Processo**:
  - `index.js`: Aggiornato `unhandledRejection` per loggare l'errore senza terminare bruscamente il bot; configurato `uncaughtException` per eseguire il flush asincrono della cache XP (`flushCache()`) prima di uscire con codice 1, permettendo il riavvio pulito dal process manager.
- **Script di Manutenzione**:
  - `scripts/clearGuildCommands.js`: Rimosso l'ID server hardcoded di fallback, rendendo `guildId` un argomento obbligatorio da riga di comando con messaggio esplicativo.

### Performance
- **Ottimizzazione Sincronizzazione Membri**:
  - `commands/admin/sync-members.js`: Eliminato il pattern N+1 query (`UserXPModel.exists` ripetuto per ciascun membro) a favore di una singola operazione `bulkWrite`, ricavando il conteggio dei nuovi membri direttamente da `result.upsertedCount`.
- **Indicizzazione Database**:
  - `models/UserXP.js`: Aggiunto indice composto `{ guildId: 1, xp: -1 }` per velocizzare le query della classifica XP.

### Added
- **Modulo Utility Emoji**:
  - `utils/parseEmoji.js`: Estratta la logica di parsing delle emoji Discord (custom e unicode) in un modulo di utilità condiviso.
- **Documentazione Ambiente**:
  - `config/.env.example`: Documentata la variabile `NODE_ENV` spiegando il comportamento sicuro dei cookie di sessione in produzione.
- **Configurazione Git**:
  - `.gitignore`: Aggiunti `*.zip` e `*.tar.gz` ai pattern ignorati.

### Refactored
- **Deduplicazione del Codice**:
  - `commands/admin/reaction-roles.js`, `commands/admin/reaction-roles-add.js`: Aggiornati per importare la funzione comune `parseEmoji`.

## [4.5.2] - 2026-09-13

### Fixed
- **Web Dashboard & Autenticazione API**:
  - `dashboard/server.js`: Introdotto middleware `ensureGuildAdminApi` per verificare autenticazione e permessi amministrativi sulle rotte API POST (`/api/settings` e `/api/sync-members`), restituendo errori in formato JSON.
- **Comandi Slash Pubblici**:
  - `commands/public/flip.js`: Risolta l'assegnazione dell'emoji per il risultato "Testa", sostituendo l'emoji duplicata con `👑`.

### Changed
- **Architettura Bot & Ciclo di Vita**:
  - `index.js`: Rinominata la variabile di inizializzazione Express da `keep_alive` a `startDashboard` ed implementato il flush asincrono della cache XP (`flushCache()`) al ricevimento dei segnali di shutdown (`SIGINT`, `SIGTERM`).
- **Documentazione**:
  - `README.md`: Allineato il limite messaggi del comando `/clear` da 1-100 a 1-50 messaggi per corrispondere ai vincoli effettivi del codice.

### Removed
- **Moduli Legacy**:
  - `misc/googleSheetsDB.js`: Rimosso il modulo obsoleto di gestione Google Sheets v3 non più utilizzato dal bot in runtime.

### Refactored
- **Pulizia Moduli & Dipendenze**:
  - `misc/level.js`, `misc/reactionRoles.js`, `commands/admin/sync-members.js`: Rimosse le chiamate ridondanti a `dotenv.config()`.
  - `deploy-commands.js`: Rimosso l'import inutilizzato di `serverId`.
  - `utils/cooldown.js`, `commands/admin/reaction-roles.js`, `commands/admin/reaction-roles-add.js`: Aggiornati commenti e riferimenti obsoleti sostituendo Google Sheets / file JSON con MongoDB Cloud / Atlas.

## [4.5.1] - 2026-07-24

### Fixed
- **Comandi Slash Amministrativi**:
  - `commands/admin/invite.js`: Risolto il problema del link di invito vuoto nel comando `/invita` aggiungendo il recupero automatico ed il fallback per la generazione dinamica dell'invito server tramite Discord API.
- **Web Dashboard & Internazionalizzazione**:
  - `dashboard/server.js`: Inseriti gli attributi `data-i18n` nei badge di stato della connessione Discord e nelle motivazioni di blocco dei server per il cambio lingua dinamico.

### Added
- **Web Dashboard & Internazionalizzazione**:
  - `dashboard/public/js/theme-lang.js`: Aggiunte le chiavi di traduzione mancanti per footer, versione bot e badge di connessione in lingua inglese ed italiana.
  - `config/.env.example`: Aggiunto il file di esempio ed il modello di configurazione per le variabili d'ambiente.
- **Documentazione & Test**:
  - `Docs/CHECKLIST_TEST.md`: Creata la checklist di collaudo interattiva per la verifica di tutte le componenti del sistema.

### Changed
- **Web Dashboard Frontend**:
  - `dashboard/views/dashboard.html`: Collegati gli attributi `data-i18n` per la traduzione dinamica frontend del footer, del testo versione e dello stato web server.

## [4.5.0] - 2026-07-24

### Added
- **Documentazione & Branding Visuale**:
  - `README.md`: Documentazione aggiornata in lingua inglese con guida all'installazione, configurazione MongoDB ed esecuzione della dashboard.
  - `Docs/README.it.md`: Documentazione ufficiale in lingua italiana comprensiva dell'architettura multi-server e comandi slash.
  - `Docs/assets/image/*`: Risorse grafiche ufficiali comprese di avatar e banner promozionali del progetto.
  - `Docs/CHANGELOG.it.md` & `Docs/CHANGELOG.en.md`: Storico completo dei cambiamenti conforme a Keep a Changelog v1.1.0 e Semantic Versioning.

## [4.4.0] - 2026-07-24

### Added
- **Web Dashboard Express & Frontend Interattivo**:
  - `dashboard/server.js`: Server web Express integrato con autenticazione OAuth2 Discord, gestione sessioni e API per configurazione e classifiche.
  - `dashboard/views/*`: Viste HTML5 dinamiche per Login (`login.html`), Dashboard Principale (`dashboard.html`), Classifica XP (`leaderboard.html`), Selezione Guild (`select-guild.html`), Impostazioni (`settings.html`) ed Errore Autorizzazioni (`unauthorized.html`).
  - `dashboard/public/css/style.css`: Foglio di stile CSS personalizzato con tema scuro e design moderno glassmorphism.
  - `dashboard/public/js/theme-lang.js`: Script frontend per il cambio tema dinamico (chiaro/scuro) e internazionalizzazione (italiano/inglese).
  - `dashboard/public/images/avatar.gif`: Asset grafico predefinito dell'avatar bot per la dashboard.

## [4.3.0] - 2026-07-24

### Added
- **Utility di Sistema & Gestori Eventi**:
  - `utils/logger.js`: Logger strutturato con timestamp ISO e livelli di severità (`INFO`, `WARN`, `ERROR`).
  - `utils/cooldown.js`: Gestore di rate limiting e cooldown per utente sui comandi pesanti.
  - `utils/translator.js`: Modulo di traduzione centralizzato con fallback automatico (DeepL API & Google Cloud Translation).
  - `utils/guildSettings.js`: Utility helper per la gestione e il recupero delle impostazioni multi-server su MongoDB.
  - `utils/loadCommands.js`: Inizializzatore condiviso e ricorsivo per il caricamento dinamico dei comandi slash.
- **Moduli di Logica Bot**:
  - `misc/counter.js`: Sistema di aggiornamento automatico del canale vocale contatore membri.
  - `misc/level.js`: Gestore dell'esperienza XP per messaggi di testo ed attività nei canali vocali con notifiche di level-up.
  - `misc/reactionRoles.js`: Gestore degli eventi di aggiunta/rimozione reazioni per la gestione automatica dei ruoli.
  - `misc/welcome.js`: Notifiche ricche in formato embed per gli eventi di benvenuto ed addio dei membri.

## [4.2.0] - 2026-07-23

### Added
- **Comandi Pubblici & Mini-Giochi**:
  - `commands/public/flip.js`: Comando slash per il lancio della moneta (Testa o Croce).
  - `commands/public/roll.js`: Comando slash per il lancio di un dado a N facce.
  - `commands/public/userinfo.js`: Comando slash per visualizzare le informazioni dettagliate di un utente del server.
  - `commands/public/ping.js`: Comando per verificare la latenza del bot e del WebSocket di Discord.
  - `commands/public/help.js`: Guida interattiva ai comandi pubblici disponibili.
  - `commands/public/serverinfo.js`: Statistiche complete del server Discord.
  - `commands/public/traduci.js`: Comando di traduzione istantanea di testi in varie lingue.
  - `commands/public/classifica.js`: Classifica interattiva dei membri del server basata sui livelli XP.

## [4.1.0] - 2026-07-22

### Added
- **Comandi Amministrativi & Moderazione**:
  - `commands/admin/reaction-roles-add.js`: Sotto-comando per l'aggiunta rapida di singole coppie emoji-ruolo.
  - `commands/admin/sync-members.js`: Comando di sincronizzazione manuale dei membri e dei ruoli con il database.
  - `commands/admin/clear.js`: Pulizia massiva dei messaggi di un canale con validazione dei limiti Discord.
  - `commands/admin/embed.js`: Costruttore di messaggi embed personalizzati.
  - `commands/admin/helpAdmin.js`: Pannello di aiuto dedicato ai comandi di amministrazione.
  - `commands/admin/invite.js`: Generatore di link di invito sicuro per il bot.
  - `commands/admin/reaction-roles.js`: Pannello principale per la creazione e configurazione dei Reaction Roles.
  - `commands/admin/set.js`: Configurazione rapida dei canali e ruoli del server.

## [4.0.0] - 2026-07-21

### Added
- **Architettura MongoDB & Persistenza Cloud**:
  - `misc/database.js`: Modulo di connessione Mongoose per MongoDB Atlas Cloud.
  - `models/GuildSettings.js`: Schema Mongoose per la memorizzazione delle configurazioni per-guild.
  - `models/ReactionRole.js`: Schema Mongoose per la gestione dei reaction roles e messaggi associati.
  - `models/UserXP.js`: Schema Mongoose per la persistenza dell'XP e dei livelli degli utenti.
  - `scripts/migrateSheetsToMongo.js`: Script automatizzato per la migrazione dei dati storici da Google Sheets a MongoDB Cloud.
  - `misc/googleSheetsDB.js`: Helper di interoperabilità con l'API Google Sheets.
- **Configurazione e Deployment**:
  - `.gitattributes` & `.gitignore`: Regole di tracciamento Git e protezione dei secret di ambiente.
  - `package.json` & `package-lock.json`: Definizione dipendenze del progetto.
  - `config/config.js`: Configurazione predefinita globale.
  - `deploy-commands.js`: Script di registrazione globale ed immediata dei comandi slash tramite Discord API REST v10.
  - `index.js`: Punto di ingresso principale del bot Discord con gestione eventi ed avvio concorrente dei moduli.

## [3.4.7] - 2026-07-20

### Added
- **Dashboard Web Dinamica**:
  - `dashboard/server.js`: Server web Express con autenticazione Discord OAuth2, configurazioni modificabili a runtime e API per la classifica (sostituisce `keep_alive.js`).
  - `dashboard/views/*`: Nuove viste HTML/CSS interattive per il login, le statistiche del bot, la classifica membri in tempo reale e il pannello delle impostazioni.
  - `config/.env`: Aggiunte variabili d'ambiente per il client secret, callback URI, session secret e ID ruoli admin.
- **Pannello di Monitoraggio HTML**:
  - `keep_alive.js` & `index.js`: Introdotto un pannello HTML interattivo con statistiche e stato di connessione in tempo reale del bot Discord (dal commit `feat(keep-alive): introduce interactive HTML status dashboard with Discord connection details`).

### Fixed
- **Classifica Membri Usciti**:
  - `dashboard/server.js` & `commands/public/classifica.js`: Nascosti dalla classifica gli utenti che hanno lasciato il server, mantenendo i loro dati nel database.

### Changed
- **Personalizzazione Embed Benvenuto/Addio**:
  - `misc/welcome.js`: Rimosso data e ora dall'embed di benvenuto e modificato il colore dell'embed di addio a rosso (dal commit `style(welcome): remove timestamp from welcome embed and change goodbye color to red`).
- **Pulizia Log XP**:
  - `misc/level.js`: Nascosti i log di successo della sincronizzazione della cache XP su Sheets per mantenere la console pulita (dal commit `style(level): hide success log for XP cache sync to keep console clean`).

## [3.4.6] - 2026-07-13

### Added
- **Messaggi di Benvenuto/Addio come Embed**:
  - `misc/welcome.js`: Convertiti i messaggi semplici di benvenuto e addio in ricchi embed con colore azzurro (`0x3498db`), miniatura con l'avatar dell'utente e contatore membri (dal commit `feat(welcome): convert welcome and goodbye messages to embeds`).

### Changed
- **Colore Embed Unificato**:
  - Unificato il colore di tutti gli embed del bot ad azzurro pastello (`0x3498db`) per una maggiore coerenza visiva.
  - `misc/level.js`: Modificato colore dell'embed di level-up da oro a azzurro (dal commit `style(level): unify embed color to light blue`).
  - `commands/public/traduci.js`: Cambiato il colore dell'embed da blu vivo a azzurro (dal commit `style(traduci): unify embed color to light blue`).
  - `commands/public/help.js`: Cambiato il colore dell'embed da blu vivo a azzurro (dal commit `style(help): unify embed color to light blue`).
  - `commands/public/classifica.js`: Cambiato il colore dell'embed da blu vivo a azzurro (dal commit `style(classifica): unify embed color to light blue`).
  - `commands/admin/reaction-roles.js`: Cambiato il colore dell'embed da blu vivo a azzurro (dal commit `style(reaction-roles): unify embed color to light blue`).
  - `commands/admin/helpAdmin.js`: Cambiato il colore dell'embed da blu vivo a azzurro (dal commit `style(helpAdmin): unify embed color to light blue`).
  - `commands/admin/embed.js`: Cambiato il colore dell'embed da blu vivo a azzurro (dal commit `style(embed): unify embed color to light blue`).
  - `commands/public/serverinfo.js`: Formattato il codice e rimossi spazi vuoti/commenti superflui (dal commit `style(serverinfo): format embed code and remove trailing spaces`).

## [3.4.5] - 2026-06-04

### Changed
- **Configurazione Repository**:
  - `.gitignore`: Migliorate le esclusioni dei file temporanei, OS e IDE, mantenendo tracciati i segreti per la repo privata (dal commit `chore(git): improve ignore configurations for node, os, and ides`).
  - `package.json`: Configurate le dipendenze aggiornate e gli script del package manager (dal commit `chore(deps): update dependencies and configure scripts`).
  - `package-lock.json`: Aggiornato il file di lock delle dipendenze (dal commit `chore(deps): lock file update`).

### Fixed
- **Chiarimenti Configurazione**:
  - `config/config.js`: Aggiunti commenti esplicativi e di configurazione per i canali di benvenuto/addio (dal commit `chore(config): add comments clarifying welcome and goodbye channels`).

## [3.4.4] - 2026-06-04

### Added
- **Logger Strutturato**:
  - `utils/logger.js`: Introdotta utility centralizzata di logging con timestamp ISO e livelli di gravità (dal commit `feat(logger): introduce structured logger with iso timestamps`).
- **Sistema di Cooldown**:
  - `utils/cooldown.js`: Implementato il sistema di rate limiting (cooldown) per utente per prevenire lo spam di comandi pesanti (dal commit `feat(cooldown): implement command rate limiting and user cooldowns`).
- **Traduttore Centralizzato**:
  - `utils/translator.js`: Aggiunto supporto a traduzioni stabili tramite DeepL API e Google Cloud Translation API con fallback robusto (dal commit `feat(translator): add stable translation via deepl and google apis`).
- **Reaction Roles Avanzati**:
  - `commands/admin/reaction-roles.js`: Aumentato il limite di coppie emoji/ruolo configurabili da 5 a 10 con deferReply preventivo (dal commit `feat(reaction-roles): increase pairs limit and add deferReply`).

### Changed
- **Integrazione Traduzione**:
  - `commands/public/traduci.js`: Integrato il nuovo modulo traduttore stabile per le traduzioni (dal commit `refactor(traduci): integrate new stable translator module`).

## [3.4.3] - 2026-06-04

### Changed
- **Inizializzazione Comandi**:
  - `utils/loadCommands.js`: Creata utility condivisa per il caricamento ricorsivo dei comandi slash per eliminare codice duplicato (dal commit `refactor(loader): share command loading logic between startup and deploy`).
  - `deploy-commands.js`: Aggiornato lo script per usare il loader condiviso e configurato l'avvio automatico se eseguito direttamente (dal commit `refactor(deploy): update command loader and auto-invoke on direct execution`).
  - `index.js`: Integrato il caricamento condiviso dei comandi, il sistema di cooldown e la gestione robusta degli errori dell'interazione (dal commit `refactor(index): integrate shared loader, cooldowns, and robust error handling`).
- **Gestione Database Sheets**:
  - `misc/googleSheetsDB.js`: Ottimizzate le chiamate alle API di Google Sheets e aggiunti metodi pubblici generici (dal commit `refactor(db): optimize API usage and add generic raw methods`).
  - `misc/reactionRoles.js`: Spostate le logiche Sheets dentro i metodi pubblici per rimuovere l'accesso diretto alla proprietà sheets (dal commit `refactor(reaction-roles): remove direct sheets access and use public DB methods`).

## [3.4.2] - 2026-06-04

### Fixed
- **Comandi Amministrativi**:
  - `commands/admin/clear.js`: Corretto l'output del comando slash per mostrare il numero effettivo di messaggi eliminati (dal commit `fix(clear): show actual number of deleted messages`).
  - `commands/admin/embed.js`: Aggiunta la validazione sulla lunghezza massima consentita da Discord per titoli e descrizioni dell'embed (dal commit `fix(embed): validate title and description maximum length`).
  - `commands/admin/helpAdmin.js`: Aggiunto il controllo dei permessi amministrativi per proteggere il comando `/help_admin` (dal commit `fix(help-admin): secure command with admin permission checks`).
  - `commands/admin/invite.js`: Aggiunta la protezione dei permessi amministrativi per il comando `/invita` (dal commit `fix(invite): secure command with admin permission checks`).
  - `commands/admin/set.js`: Inserito il filtro utente sul collector delle opzioni e corretta la corrispondenza delle chiavi di configurazione (dal commit `fix(set): add user filter to collector and improve key validation`).

## [3.4.1] - 2026-06-04

### Fixed
- **Comandi Pubblici**:
  - `commands/public/ping.js`: Corretto l'output per mostrare la latenza reale delle API Discord anziché un valore casuale (dal commit `fix(ping): report real latency instead of random value`).
  - `commands/public/classifica.js`: Aggiunto il deferReply per evitare timeout e protetta la chiusura del collector in caso di eliminazione del messaggio (dal commit `fix(classifica): add deferReply and handle collector end error`).
  - `commands/public/serverinfo.js`: Aggiunti JSDoc e fetch manuale dei membri per ottenere statistiche aggiornate (dal commit `fix(serverinfo): fetch guild members and add jsdoc documentation`).
  - `commands/public/help.js`: Rimossi i log di debug residui in produzione (dal commit `chore(help): remove production debug logging`).
- **Integrazioni e Logiche**:
  - `misc/level.js`: Risolta la race condition sul salvataggio dell'XP e ridotte le chiamate a Sheets per gli utenti in canale vocale tramite cache in memoria (dal commit `fix(level): resolve XP race condition using in-memory cache and flush`).
  - `misc/welcome.js`: Aggiunto l'await sulle chiamate `send()` per intercettare gli errori di invio in caso di permessi mancanti (dal commit `fix(welcome): await send calls to handle missing permission errors`).
  - `misc/counter.js`: Cambiato l'intervallo di rinominazione dei canali vocali a 10 minuti per rispettare i rate-limit di Discord (dal commit `fix(counter): increase update interval to avoid discord rate limits`).
- **Pulizia Codice**:
  - `keep_alive.js`: Sostituito l'uso di `var` con `const` per uniformità di stile (dal commit `style(keep-alive): use const instead of var`).

## [3.0.0] - 2025-11-10

### Added
- **Comandi Base**: Aggiunti comandi slash pubblici e amministrativi di base.
- **Integrazione Reaction Role**: Implementazione delle reazioni per assegnare ruoli.
- **Caricamento Comandi**: Loader ricorsivo per la registrazione automatica dei comandi.

## [1.0.0] - 2025-03-10

### Added
- **Struttura Iniziale**: Import iniziale del progetto e configurazione del repository.
