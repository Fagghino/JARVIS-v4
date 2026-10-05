/**
 * Server web Express per la Dashboard di JARVIS (Multi-Server)
 *
 * Gestisce l'autenticazione Discord OAuth2, il controllo permessi per server,
 * il selettore server dinamico (con stati abilitati/disabilitati),
 * la gestione configurazioni su MongoDB Cloud ed il supporto Temi/Lingue.
 */

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { version } = require("../package.json");
const defaultConfig = require("../config/config.js");
const { getGuildConfig, updateGuildConfig } = require("../utils/guildSettings.js");
const { loadXPData } = require("../misc/level.js");

module.exports = (client) => {
  const app = express();
  const PORT = process.env.PORT || 8080;

  function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  app.set("trust proxy", 1);

  // Helmet per sicurezza headers e CSP (ALTA-02)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://cdn.discordapp.com"],
        connectSrc: ["'self'"]
      }
    }
  }));

  const client_id = process.env.DISCORD_CLIENT_ID;
  const client_secret = process.env.DISCORD_CLIENT_SECRET;
  const redirect_uri = process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/callback`;

  const isOauthConfigured = !!(client_id && client_secret);

  if (!isOauthConfigured) {
    console.warn("⚠️ ATTENZIONE: DISCORD_CLIENT_ID e/o DISCORD_CLIENT_SECRET non definiti nel file .env.");
  }

  let sessionStore;
  if (process.env.MONGODB_URI) {
    try {
      const MongoStore = require("connect-mongo");
      sessionStore = MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: "sessions",
        ttl: 24 * 60 * 60
      });
    } catch (err) {
      console.warn("⚠️ Impossibile inizializzare connect-mongo:", err.message);
    }
  }

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: 'lax'
      },
    })
  );

  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(express.static(path.join(__dirname, "public")));

  // Limitatori di richieste (ALTA-03)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // max 100 richieste per IP ogni 15 minuti su /api
    message: { message: "Troppe richieste all'API, riprova più tardi." }
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // max 20 tentativi per IP ogni 15 minuti su /auth
    message: "Troppi tentativi di autenticazione, riprova più tardi."
  });

  app.use("/api", apiLimiter);
  app.use("/auth", authLimiter);

  function renderTemplate(res, templateName, variables = {}) {
    const templatePath = path.join(__dirname, "views", templateName);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("<h1>Errore 404: Vista non trovata</h1>");
    }

    try {
      let content = fs.readFileSync(templatePath, "utf8");

      if (templateName === "login.html") {
        const errorMsg = variables.error || "";
        if (errorMsg) {
          content = content
            .replace(/<% if \(error\) \{ %>([\s\S]*?)<% \} %>/g, "$1")
            .replace(/<%= error %>/g, errorMsg);
        } else {
          content = content.replace(/<% if \(error\) \{ %>([\s\S]*?)<% \} %>/g, "");
        }
      }

      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`<%= ${key} %>`, "g");
        const safeValue = (key === 'userBarHtml' || key.endsWith('Html')) ? value : escapeHtml(value);
        content = content.replace(regex, safeValue !== undefined && safeValue !== null ? safeValue : "");
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(content);
    } catch (err) {
      console.error(`Errore nel caricamento del template ${templateName}:`, err.message);
      res.status(500).send("<h1>Errore Interno del Server</h1>");
    }
  }

  // Barra Profilo Utente con selettore Tema e Lingua
  function getUserBarHtml(user) {
    const avatarUrl = user && user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
      : user
      ? `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`
      : "";

    return `
      <div class="user-bar">
        <div class="user-info">
          ${user ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(user.username)}" class="user-avatar">
          <span class="user-name">${escapeHtml(user.username)}</span>` : `<span>J.A.R.V.I.S. Panel</span>`}
        </div>
        <div class="theme-lang-bar" style="display: flex; align-items: center; gap: 10px;">
          <button id="themeToggleBtn" class="theme-toggle-btn" style="background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); color: var(--text); padding: 5px 12px; border-radius: 8px; cursor: pointer;">☀️ Light</button>
          <select id="langSelect" class="lang-select" style="background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); color: var(--text); padding: 5px 10px; border-radius: 8px; cursor: pointer;">
            <option value="it" style="background: #101623; color: #fff;">🇮🇹 ITA</option>
            <option value="en" style="background: #101623; color: #fff;">🇬🇧 ENG</option>
          </select>
          ${user ? `<a href="/auth/logout" class="btn-logout" data-i18n="logout">Esci</a>` : ""}
        </div>
      </div>
    `;
  }

  // Middleware Autenticazione
  function ensureAuthenticated(req, res, next) {
    if (!isOauthConfigured) {
      return res.status(403).send("<h1>OAuth2 Non Configurato</h1><p>Inserisci DISCORD_CLIENT_ID e DISCORD_CLIENT_SECRET nel file .env.</p><a href='/'>Torna alla Home</a>");
    }
    
    // Rende la funzione escapeHtml globale così che le altre funzioni come getUserBarHtml 
    // vi abbiano accesso, o spostala fuori.
    
    if (req.session && req.session.user) {
      return next();
    }
    res.redirect("/");
  }

  // Middleware Verifica Presenza in almeno un Server gestito dal Bot
  function ensureInAnyBotGuild(req, res, next) {
    if (!req.session || !req.session.user) {
      return next();
    }

    const userGuilds = req.session.guilds || [];
    const botGuildIds = Array.from(client.guilds.cache.keys());

    const isMemberOfAny = userGuilds.some(g => botGuildIds.includes(g.id));

    if (!isMemberOfAny && botGuildIds.length > 0) {
      return renderTemplate(res, "unauthorized.html", {
        userBarHtml: getUserBarHtml(req.session.user)
      });
    }

    next();
  }

  // Middleware Verifica Appartenenza a uno specifico Server
  async function ensureInGuild(req, res, next) {
    const guildId = req.params.guildId;
    const userId = req.session.user.id;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).send(`<h1>Server non trovato</h1><p>Il bot JARVIS non è presente nel server specificato.</p><a href='/select-guild'>Seleziona un altro server</a>`);
    }

    try {
      const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return res.status(403).send("<h1>Accesso Negato</h1><p>Non sei un membro di questo server.</p><a href='/select-guild'>Torna alla Selezione Server</a>");
      }
      req.guild = guild;
      req.member = member;
      next();
    } catch (error) {
      res.status(500).send("Errore durante la verifica dei permessi.");
    }
  }

  // Middleware Verifica Permessi Admin per uno specifico Server
  function ensureGuildAdmin(req, res, next) {
    const member = req.member;
    const guild = req.guild;

    const isOwner = member.id === guild.ownerId;
    const isAdmin = member.permissions.has("Administrator") || member.permissions.has("ManageGuild");

    if (isOwner || isAdmin) {
      return next();
    }

    res.status(403).send("<h1>Accesso Negato</h1><p>Devi avere i permessi di Amministratore o Gestione Server per questa sezione.</p><a href='/select-guild'>Torna ai tuoi Server</a>");
  }

  // Middleware Verifica Permessi Admin per API (Risposta JSON)
  async function ensureGuildAdminApi(req, res, next) {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Non autenticato." });
    }

    const targetGuildId = req.params.guildId || req.query.guildId || req.body?.guildId;
    if (!targetGuildId) {
      return res.status(400).json({ message: "guildId richiesto." });
    }

    const userId = req.session.user.id;
    const guild = client.guilds.cache.get(targetGuildId);

    if (!guild) {
      return res.status(404).json({ message: "Server Discord non accessibile dal Bot." });
    }

    try {
      const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return res.status(403).json({ message: "Accesso negato: non sei membro di questo server." });
      }

      const isOwner = member.id === guild.ownerId;
      const isAdmin = member.permissions.has("Administrator") || member.permissions.has("ManageGuild");

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Accesso negato: permessi amministrativi richiesti." });
      }

      req.guild = guild;
      req.member = member;
      next();
    } catch (error) {
      res.status(500).json({ message: "Errore durante la verifica dei permessi." });
    }
  }

  // Middleware Richiesta JSON (SUGGERIMENTO-01)
  function requireJsonContent(req, res, next) {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const hasBody = req.headers['content-length'] > 0 || req.headers['transfer-encoding'];
      if (hasBody && !req.is('application/json')) {
        return res.status(400).json({ message: "Content-Type deve essere application/json" });
      }
    }
    next();
  }

  app.use("/api", requireJsonContent);

  // Middleware Verifica Membro per API (Risposta JSON)
  async function ensureGuildMemberApi(req, res, next) {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Non autenticato." });
    }

    const targetGuildId = req.params.guildId || req.query.guildId || req.body?.guildId;
    if (!targetGuildId) {
      return res.status(400).json({ message: "guildId richiesto." });
    }

    const userId = req.session.user.id;
    const guild = client.guilds.cache.get(targetGuildId);

    if (!guild) {
      return res.status(404).json({ message: "Server Discord non accessibile dal Bot." });
    }

    try {
      const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return res.status(403).json({ message: "Accesso negato: non sei membro di questo server." });
      }

      req.guild = guild;
      req.member = member;
      next();
    } catch (error) {
      res.status(500).json({ message: "Errore durante la verifica dei permessi." });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ROTTE PRINCIPALI WEB
  // ─────────────────────────────────────────────────────────────────────────

  // Home Page (Generica Bot Status)
  app.get("/", ensureInAnyBotGuild, async (req, res) => {
    if (!req.session.user) {
      let errorMsg = req.query.error || "";
      if (!isOauthConfigured) {
        errorMsg = "Il server OAuth2 non è configurato. Aggiungi le chiavi CLIENT_ID e CLIENT_SECRET nel file config/.env";
      }
      return renderTemplate(res, "login.html", { error: errorMsg });
    }

    const user = req.session.user;

    const seconds = process.uptime();
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const uptimeText = `${d > 0 ? d + "g " : ""}${h > 0 ? h + "o " : ""}${m > 0 ? m + "m " : ""}${s}s`;

    let discordStatusHtml = '<span style="color: var(--offline)" data-i18n="disconnectedStatus">🔴 Disconnesso</span>';
    let statusClass = "inactive";
    let guildsCount = "0";
    let pingText = "N/D";
    let avatarHtml = '<div class="avatar">🤖</div>';

    if (client && client.user) {
      const isReady = client.ws.status === 0;
      if (isReady) {
        discordStatusHtml = '<span style="color: var(--online)" data-i18n="connectedStatus">🟢 Connesso</span>';
        statusClass = "active";
      } else if (client.ws.status === 1 || client.ws.status === 2) {
        discordStatusHtml = '<span style="color: var(--pending)" data-i18n="connectingStatus">🟡 In connessione</span>';
        statusClass = "pending";
      }

      guildsCount = client.guilds.cache.size.toString();
      pingText = client.ws.ping >= 0 ? `${client.ws.ping} ms` : "Calcolo...";

      if (client.user.avatar) {
        const avatarUrl = client.user.displayAvatarURL({ extension: "png", size: 128 });
        avatarHtml = `<img src="${avatarUrl}" alt="Avatar" class="avatar">`;
      }
    }

    const memoryText = `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`;
    const discordJsVersion = require("discord.js").version;

    const leaderboardBtnHtml = '<a href="/select-guild?mode=leaderboard" class="btn" data-i18n="leaderboardBtn">🏆 Classifica Server</a>';
    const settingsBtnHtml = '<a href="/select-guild?mode=settings" class="btn btn-secondary" data-i18n="settingsBtn">⚙️ Impostazioni Bot</a>';

    renderTemplate(res, "dashboard.html", {
      userBarHtml: getUserBarHtml(user),
      avatarHtml,
      statusClass,
      version,
      discordStatusHtml,
      guildsCount,
      uptimeText,
      pingText,
      memoryText,
      nodeVersion: process.version,
      discordJsVersion,
      leaderboardBtnHtml,
      settingsBtnHtml
    });
  });

  // Selezione Server con Griglia e Stati Abilitati/Disabilitati (Grigio)
  app.get("/select-guild", ensureAuthenticated, ensureInAnyBotGuild, async (req, res) => {
    const user = req.session.user;
    const userGuilds = req.session.guilds || [];
    const mode = req.query.mode || "settings"; // 'settings' oppure 'leaderboard'

    const botGuilds = Array.from(client.guilds.cache.values());
    let cardsHtml = "";

    for (const bg of botGuilds) {
      // Verifica se l'utente appartiene a questo server
      const userGuildInfo = userGuilds.find(g => g.id === bg.id);
      const isMember = !!userGuildInfo;

      let isEligible = isMember;
      let lockReason = "";
      let lockKey = "";

      if (!isMember) {
        lockReason = "🔒 Non sei in questo server";
        lockKey = "lockNotInServer";
      } else if (mode === "settings") {
        const permissions = BigInt(userGuildInfo.permissions);
        const isAdmin = (permissions & BigInt(0x8)) === BigInt(0x8) || (permissions & BigInt(0x20)) === BigInt(0x20) || userGuildInfo.owner;
        if (!isAdmin) {
          isEligible = false;
          lockReason = "🔒 Permessi Admin richiesti";
          lockKey = "lockNoAdmin";
        }
      }

      const iconUrl = bg.iconURL({ extension: "png", size: 128 }) || "https://cdn.discordapp.com/embed/avatars/0.png";

      if (isEligible) {
        cardsHtml += `
          <div class="guild-card active-card">
            <img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(bg.name)}" class="guild-icon">
            <div class="guild-name">${escapeHtml(bg.name)}</div>
            <div class="guild-actions">
              ${mode === "settings"
                ? `<a href="/settings/${bg.id}" class="btn" data-i18n="settingsBtn">⚙️ Impostazioni</a>`
                : `<a href="/leaderboard/${bg.id}" class="btn" data-i18n="leaderboardBtn">🏆 Classifica</a>`
              }
            </div>
          </div>
        `;
      } else {
        cardsHtml += `
          <div class="guild-card disabled-card">
            <img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(bg.name)}" class="guild-icon">
            <div class="guild-name">${escapeHtml(bg.name)}</div>
            <div class="lock-badge" data-i18n="${lockKey}">${escapeHtml(lockReason)}</div>
          </div>
        `;
      }
    }

    if (!cardsHtml) {
      cardsHtml = `<p style="grid-column: 1/-1; text-align: center; opacity: 0.8;">Nessun server disponibile.</p>`;
    }

    renderTemplate(res, "select-guild.html", {
      userBarHtml: getUserBarHtml(user),
      guildsGridHtml: cardsHtml
    });
  });

  // Classifica Server Dinamica
  app.get("/leaderboard/:guildId", ensureAuthenticated, ensureInGuild, (req, res) => {
    renderTemplate(res, "leaderboard.html", {
      userBarHtml: getUserBarHtml(req.session.user),
      guildId: req.params.guildId,
      guildName: req.guild.name
    });
  });

  app.get("/leaderboard", ensureAuthenticated, (req, res) => {
    res.redirect("/select-guild?mode=leaderboard");
  });

  // Impostazioni Server Dinamiche
  app.get("/settings/:guildId", ensureAuthenticated, ensureInGuild, ensureGuildAdmin, (req, res) => {
    renderTemplate(res, "settings.html", {
      userBarHtml: getUserBarHtml(req.session.user),
      guildId: req.params.guildId,
      guildName: req.guild.name
    });
  });

  app.get("/settings", ensureAuthenticated, (req, res) => {
    res.redirect("/select-guild?mode=settings");
  });

  // Login Discord OAuth2
  const crypto = require('crypto');
  app.get("/auth/login", (req, res) => {
    if (!isOauthConfigured) {
      return res.redirect("/?error=OAuth2 non configurato nel file .env.");
    }
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    const url = `https://discord.com/api/oauth2/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(
      redirect_uri
    )}&response_type=code&scope=identify%20guilds&state=${state}`;
    res.redirect(url);
  });

  // Callback Discord OAuth2
  app.get("/auth/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code) return res.redirect("/?error=Codice autorizzazione mancante.");
    if (!state || state !== req.session.oauthState) {
      return res.redirect("/?error=Validazione stato OAuth fallita.");
    }
    delete req.session.oauthState;

    try {
      const tokenResponse = await axios.post(
        "https://discord.com/api/oauth2/token",
        new URLSearchParams({
          client_id,
          client_secret,
          grant_type: "authorization_code",
          code,
          redirect_uri,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const accessToken = tokenResponse.data.access_token;

      const userResponse = await axios.get("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const guildsResponse = await axios.get("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      req.session.user = {
        id: userResponse.data.id,
        username: userResponse.data.username,
        avatar: userResponse.data.avatar,
      };

      req.session.guilds = guildsResponse.data;

      res.redirect("/");
    } catch (error) {
      console.error("❌ Errore autenticazione callback Discord:", error.response ? error.response.data : error.message);
      res.redirect("/?error=Autenticazione fallita.");
    }
  });

  // Logout
  app.get("/auth/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // API ENDPOINTS (PER-GUILD)
  // ─────────────────────────────────────────────────────────────────────────

  // API Leaderboard
  app.get("/api/leaderboard/:guildId?", ensureAuthenticated, ensureGuildMemberApi, async (req, res) => {
    try {
      const targetGuildId = req.params.guildId || req.query.guildId;
      if (!targetGuildId) return res.status(400).json({ message: "guildId richiesto." });

      const xpData = await loadXPData(targetGuildId);
      const guild = client.guilds.cache.get(targetGuildId);

      const leaderboard = [];
      const userIDs = Object.keys(xpData);

      for (const userID of userIDs) {
        const xpInfo = xpData[userID];
        let member = null;
        if (guild) {
          member = guild.members.cache.get(userID) || await guild.members.fetch(userID).catch(() => null);
        }

        if (!member) continue;

        const userObj = member.user;
        leaderboard.push({
          id: userID,
          username: userObj.username,
          xp: xpInfo.xp,
          level: xpInfo.level,
          avatarUrl: userObj.displayAvatarURL({ extension: "png", size: 64 }),
        });
      }

      leaderboard.sort((a, b) => b.level !== a.level ? b.level - a.level : b.xp - a.xp);

      const sortedLeaderboard = leaderboard.map((user, index) => ({
        position: index + 1,
        ...user,
      }));

      res.json(sortedLeaderboard);
    } catch (err) {
      console.error("Errore recupero classifica API:", err.message);
      res.status(500).json({ message: "Impossibile recuperare i dati della classifica." });
    }
  });

  // API Recupero Impostazioni
  app.get("/api/settings/:guildId?", ensureAuthenticated, ensureGuildAdminApi, async (req, res) => {
    const targetGuildId = req.params.guildId || req.query.guildId;
    const guild = client.guilds.cache.get(targetGuildId);

    if (!guild) {
      return res.status(404).json({ message: "Server Discord non accessibile dal Bot." });
    }

    const guildConfig = await getGuildConfig(targetGuildId);

    const channels = guild.channels.cache.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
    }));

    const roles = guild.roles.cache.map((r) => ({
      id: r.id,
      name: r.name,
    }));

    res.json({
      currentConfig: guildConfig,
      channels,
      roles,
    });
  });

  // API Salvataggio Impostazioni per-server (MongoDB)
  app.post("/api/settings/:guildId?", ensureAuthenticated, ensureGuildAdminApi, async (req, res) => {
    const targetGuildId = req.params.guildId || req.query.guildId;
    
    // Whitelist dei campi consentiti per evitare Mass Assignment (ALTA-06)
    const settingsWhitelist = [
      'welcomeChannelId', 'goodbyeChannelId', 'levelUpChannelId',
      'totalChannelId', 'usersChannelId', 'botsChannelId',
      'newMemberRoleId', 'botRoleId', 'inviteLink'
    ];
    
    const updatedSettings = {};
    for (const key of settingsWhitelist) {
      if (req.body[key] !== undefined) {
        updatedSettings[key] = req.body[key];
      }
    }

    try {
      await updateGuildConfig(targetGuildId, updatedSettings);
      console.log(`⚙️ Impostazioni aggiornate per il server [${targetGuildId}] via Web Dashboard!`);
      res.json({ message: "Impostazioni applicate e salvate su MongoDB con successo." });
    } catch (error) {
      console.error("Errore salvataggio impostazioni:", error);
      res.status(500).json({ message: "Impossibile salvare le impostazioni." });
    }
  });

  // API Sincronizzazione Membri per-server
  app.post("/api/sync-members/:guildId?", ensureAuthenticated, ensureGuildAdminApi, async (req, res) => {
    const targetGuildId = req.params.guildId || req.query.guildId;
    try {
      const guild = client.guilds.cache.get(targetGuildId);
      if (!guild) return res.status(404).json({ message: "Server non accessibile." });

      await guild.members.fetch({ time: 60000 }).catch(() => {});
      const allMembers = guild.members.cache;

      const xpData = await loadXPData(targetGuildId);
      let addedCount = 0;
      let updatedCount = 0;

      allMembers.forEach((member) => {
        if (member.user.bot) return;
        const userID = member.id;
        if (!xpData[userID]) {
          xpData[userID] = { xp: 0, level: 0 };
          addedCount++;
        } else {
          updatedCount++;
        }
      });

      const { flushCache } = require("../misc/level.js");
      await flushCache();

      res.json({
        message: "Sincronizzazione completata.",
        added: addedCount,
        updated: updatedCount,
        total: allMembers.size,
      });
    } catch (error) {
      res.status(500).json({ message: `Errore: ${error.message}` });
    }
  });

  // Avvio Server Web
  app.listen(PORT, () => {
    console.log(`🚀 Web Dashboard attiva su http://localhost:${PORT}`);
  });
};
