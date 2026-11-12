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
const fs = require("fs");
const path = require("path");
const { Routes } = require("discord.js");
const { version } = require("../package.json");
const defaultConfig = require("../config/config.js");
const { getGuildConfig, updateGuildConfig } = require("../utils/guildSettings.js");
const { loadXPData } = require("../misc/level.js");
const ReactionRoleModel = require("../models/ReactionRole.js");
const { addReactionRole, removeReactionRole } = require("../misc/reactionRoles.js");

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
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        scriptSrcAttr: ["'unsafe-inline'"],
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

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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

  // Cache in memoria dei template per produzione (PERF-003)
  const templateCache = new Map();

  function getTemplateContent(templatePath, templateName) {
    if (process.env.NODE_ENV === "production" && templateCache.has(templateName)) {
      return templateCache.get(templateName);
    }
    const content = fs.readFileSync(templatePath, "utf8");
    if (process.env.NODE_ENV === "production") {
      templateCache.set(templateName, content);
    }
    return content;
  }

  function renderTemplate(res, templateName, variables = {}) {
    const templatePath = path.join(__dirname, "views", templateName);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("<h1>Errore 404: Vista non trovata</h1>");
    }

    try {
      let content = getTemplateContent(templatePath, templateName);

      if (templateName === "landing.html") {
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

  // URL Dinamico di invito per il bot (con supporto opzionale a guild_id)
  function getBotInviteUrl(guildId = null) {
    const id = client_id || client?.user?.id;
    if (!id) return "#";
    let url = `https://discord.com/oauth2/authorize?client_id=${id}&permissions=8&scope=bot%20applications.commands`;
    if (guildId) {
      url += `&guild_id=${guildId}`;
    }
    return url;
  }

  // Generatore HTML per le azioni nella navbar della Landing Page
  function getLandingNavActionsHtml(user) {
    if (user) {
      const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`;
      return `
        <div class="nav-user-logged">
          <img src="${escapeHtml(avatarUrl)}" class="nav-user-avatar" alt="${escapeHtml(user.username)}">
          <span class="nav-user-name">${escapeHtml(user.username)}</span>
          <a href="/select-guild" class="nav-btn-action">I Miei Server</a>
          <a href="/dashboard" class="nav-btn-action">Stato Bot</a>
          <a href="/auth/logout" class="nav-btn-logout">Esci</a>
        </div>
      `;
    }
    return `
      <a href="/auth/login" class="btn-login-discord">
        <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="currentColor">
          <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,69.43,69.43,0,0,1-10.5-5c.9-.65,1.76-1.34,2.58-2.06a75.48,75.48,0,0,0,73,0c.82.72,1.68,1.41,2.58,2.06a69.43,69.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129,50.7,122.64,27.78,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
        </svg>
        <span>Accedi con Discord</span>
      </a>
    `;
  }

  // Generatore pulsanti Hero allineati a sinistra
  function getLandingHeroCtaHtml(user) {
    const inviteUrl = getBotInviteUrl();
    if (user) {
      return `
        <a href="/select-guild" class="btn-hero-primary">
          <span>⚙️ I Miei Server</span>
        </a>
        <a href="#plugins" class="btn-hero-secondary">
          <span>✨ Funzioni</span>
          <span>↓</span>
        </a>
      `;
    }
    return `
      <a href="${escapeHtml(inviteUrl)}" target="_blank" class="btn-hero-primary">
        <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="currentColor">
          <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,69.43,69.43,0,0,1-10.5-5c.9-.65,1.76-1.34,2.58-2.06a75.48,75.48,0,0,0,73,0c.82.72,1.68,1.41,2.58,2.06a69.43,69.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129,50.7,122.64,27.78,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
        </svg>
        <span>Aggiungi a Discord</span>
      </a>
      <a href="#plugins" class="btn-hero-secondary">
        <span>✨ Funzioni</span>
        <span>↓</span>
      </a>
    `;
  }

  // Barra Profilo Utente Unificata (Stile Navbar Glassmorphism)
  function getUserBarHtml(user) {
    const avatarUrl = user && user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
      : user
      ? `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`
      : "";

    return `
      <nav class="navbar">
        <div class="container navbar-inner" style="max-width: 1200px; margin: 0 auto; padding: 0 24px; background: transparent; border: none; box-shadow: none;">
          <a href="/" class="nav-brand">
            <img src="/images/avatar.gif" alt="JARVIS Logo" class="brand-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
            <span class="brand-title">J.A.R.V.I.S.</span>
            <span class="brand-badge">v${version}</span>
          </a>
          <div class="nav-actions">
            ${user ? `
            <div class="nav-user-logged">
              <img src="${escapeHtml(avatarUrl)}" class="nav-user-avatar" alt="${escapeHtml(user.username)}">
              <span class="nav-user-name">${escapeHtml(user.username)}</span>
              <a href="/" class="nav-btn-action">🏠 Home</a>
              <a href="/select-guild" class="nav-btn-action">⚙️ Server</a>
              <a href="/dashboard" class="nav-btn-action">📊 Stato</a>
              <a href="/auth/logout" class="nav-btn-logout">Esci</a>
            </div>
            ` : `
            <a href="/auth/login" class="btn-login-discord">Accedi con Discord</a>
            `}
          </div>
        </div>
      </nav>
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

  // ─────────────────────────────────────────────────────────────────────────
  // ROTTE PRINCIPALI WEB
  // ─────────────────────────────────────────────────────────────────────────

  // Home Page Ufficiale (Landing Page)
  app.get("/", async (req, res) => {
    let errorMsg = req.query.error || "";
    if (!isOauthConfigured && (!req.session || !req.session.user)) {
      errorMsg = "Il server OAuth2 non è configurato. Aggiungi le chiavi CLIENT_ID e CLIENT_SECRET nel file config/.env";
    }

    const user = req.session && req.session.user ? req.session.user : null;
    const inviteUrl = getBotInviteUrl();

    renderTemplate(res, "landing.html", {
      version,
      inviteUrl,
      navActionsHtml: getLandingNavActionsHtml(user),
      heroCtaHtml: getLandingHeroCtaHtml(user),
      error: errorMsg
    });
  });

  // Metriche di Sistema & Bot Status (Accessibile a utenti autenticati)
  app.get("/dashboard", ensureAuthenticated, ensureInAnyBotGuild, async (req, res) => {
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

    const settingsBtnHtml = '<a href="/select-guild" class="btn" data-i18n="settingsBtn">⚙️ Gestisci Server</a>';

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
      settingsBtnHtml
    });
  });

  // Selezione Server con suddivisione tra Server con JARVIS e Server in cui aggiungerlo
  app.get("/select-guild", ensureAuthenticated, async (req, res) => {
    const user = req.session.user;
    const userGuilds = req.session.guilds || [];
    const botGuilds = client.guilds ? client.guilds.cache : new Map();

    let presentCardsHtml = "";
    let availableCardsHtml = "";

    const sortedUserGuilds = [...userGuilds].sort((a, b) => a.name.localeCompare(b.name));

    for (const ug of sortedUserGuilds) {
      const permissions = BigInt(ug.permissions || 0);
      const isAdmin = (permissions & BigInt(0x8)) === BigInt(0x8) ||
                      (permissions & BigInt(0x20)) === BigInt(0x20) ||
                      Boolean(ug.owner);

      if (!isAdmin) continue; // Mostra solo i server in cui l'utente ha poteri di amministrazione

      const iconUrl = ug.icon
        ? `https://cdn.discordapp.com/icons/${ug.id}/${ug.icon}.png?size=128`
        : "https://cdn.discordapp.com/embed/avatars/0.png";

      const isBotPresent = botGuilds.has(ug.id);

      if (isBotPresent) {
        presentCardsHtml += `
          <div class="guild-card active-card">
            <div class="guild-badge-status badge-connected">● Attivo</div>
            <img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(ug.name)}" class="guild-icon">
            <div class="guild-name">${escapeHtml(ug.name)}</div>
            <div class="guild-actions">
              <a href="/settings/${ug.id}" class="btn-manage">⚙️ Gestisci Server</a>
              <a href="/leaderboard/${ug.id}" class="btn-leaderboard">🏆 Classifica</a>
            </div>
          </div>
        `;
      } else {
        const inviteUrl = getBotInviteUrl(ug.id);
        availableCardsHtml += `
          <div class="guild-card invite-card">
            <div class="guild-badge-status badge-available">Disponibile</div>
            <img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(ug.name)}" class="guild-icon">
            <div class="guild-name">${escapeHtml(ug.name)}</div>
            <div class="guild-actions">
              <a href="${escapeHtml(inviteUrl)}" target="_blank" class="btn btn-invite">➕ Aggiungi Bot</a>
            </div>
          </div>
        `;
      }
    }

    if (!presentCardsHtml) {
      presentCardsHtml = `<p class="empty-state">Nessun server trovato con J.A.R.V.I.S. già attivo. Aggiungilo a uno dei tuoi server sottostanti!</p>`;
    }

    if (!availableCardsHtml) {
      availableCardsHtml = `<p class="empty-state">Tutti i server di cui sei amministratore hanno già J.A.R.V.I.S. aggiunto!</p>`;
    }

    renderTemplate(res, "select-guild.html", {
      userBarHtml: getUserBarHtml(user),
      presentCardsHtml,
      availableCardsHtml
    });
  });

  // Impostazioni Server Dinamiche
  app.get("/settings/:guildId", ensureAuthenticated, ensureInGuild, ensureGuildAdmin, (req, res) => {
    renderTemplate(res, "settings.html", {
      userBarHtml: getUserBarHtml(req.session.user),
      guildId: req.params.guildId,
      guildName: req.guild.name
    });
  });

  // Classifica Server Dinamica Web (IDEA-001, DASH-002)
  app.get("/leaderboard/:guildId", ensureAuthenticated, ensureInGuild, async (req, res) => {
    const guildId = req.params.guildId;
    const guild = req.guild;
    const userBarHtml = getUserBarHtml(req.session.user);

    let rowsHtml = "";
    try {
      const UserXPModel = require("../models/UserXP.js");
      const { isDBConnected } = require("../misc/database.js");
      const { loadXPData } = require("../misc/level.js");

      let topUsers = [];
      if (isDBConnected() && UserXPModel) {
        topUsers = await UserXPModel.find({ guildId }).sort({ xp: -1 }).limit(100).lean();
      } else {
        const xpData = await loadXPData(guildId);
        topUsers = Object.entries(xpData)
          .map(([userId, u]) => ({ userId, username: u.username, xp: u.xp || 0, level: u.level || 0 }))
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 100);
      }

      if (topUsers.length === 0) {
        rowsHtml = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">Nessun dato XP registrato per questo server.</td></tr>`;
      } else {
        // Pre-fetch missing members / users from Discord API so their real avatars and names are displayed
        const missingUserIds = topUsers
          .map(u => u.userId)
          .filter(id => id && !guild.members.cache.has(id));

        if (missingUserIds.length > 0) {
          try {
            await guild.members.fetch({ user: missingUserIds });
          } catch (_) {
            // Bulk fetch could fail if some IDs are not in guild or invalid; fallback to client.users
          }

          const stillMissing = topUsers
            .map(u => u.userId)
            .filter(id => id && !guild.members.cache.has(id) && !client.users.cache.has(id))
            .slice(0, 50);

          if (stillMissing.length > 0) {
            await Promise.allSettled(stillMissing.map(id => client.users.fetch(id).catch(() => null)));
          }
        }

        rowsHtml = topUsers.map((u, index) => {
          const rankNum = index + 1;
          const rankBadge = rankNum === 1 ? '🥇' : (rankNum === 2 ? '🥈' : (rankNum === 3 ? '🥉' : `#${rankNum}`));

          const member = guild.members.cache.get(u.userId);
          const user = member?.user || client.users.cache.get(u.userId);

          let avatarUrl;
          if (member) {
            avatarUrl = member.displayAvatarURL({ extension: 'png', size: 64 });
          } else if (user) {
            avatarUrl = user.displayAvatarURL({ extension: 'png', size: 64 });
          } else {
            const defaultIndex = u.userId ? Number((BigInt(u.userId) >> 22n) % 6n) : 0;
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
          }

          const displayName = member
            ? (member.nickname || member.user.displayName || member.user.username)
            : (user ? (user.displayName || user.username) : (u.username || "Utente"));

          return `
            <tr>
              <td class="rank-cell">${rankBadge}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)}" class="user-avatar-small" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                  <strong style="color: #fff; font-size: 0.95rem;">${escapeHtml(displayName)}</strong>
                </div>
              </td>
              <td><span class="level-pill">Lv. ${u.level || 0}</span></td>
              <td><span class="xp-text">${(u.xp || 0).toLocaleString()} XP</span></td>
            </tr>
          `;
        }).join("");
      }
    } catch (err) {
      rowsHtml = `<tr><td colspan="4" style="color: #ff5252; text-align: center; padding: 20px;">Errore durante il caricamento della classifica: ${escapeHtml(err.message)}</td></tr>`;
    }

    const leaderboardHtml = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Pos.</th>
            <th>Utente</th>
            <th>Livello</th>
            <th>Punti XP</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    const guildIconUrl = (guild.iconURL && guild.iconURL({ extension: 'png', size: 128 })) || "https://cdn.discordapp.com/embed/avatars/0.png";

    renderTemplate(res, "leaderboard.html", {
      guildName: guild.name,
      guildId,
      guildIconUrl,
      userBarHtml,
      leaderboardHtml
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
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id,
          client_secret,
          grant_type: "authorization_code",
          code,
          redirect_uri,
        }),
      });

      if (!tokenRes.ok) {
        throw new Error(`Token exchange fallito (${tokenRes.status})`);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userRes.ok) {
        throw new Error(`Recupero utente fallito (${userRes.status})`);
      }

      const userData = await userRes.json();

      const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!guildsRes.ok) {
        throw new Error(`Recupero gilde fallito (${guildsRes.status})`);
      }

      const rawGuilds = await guildsRes.json();

      req.session.user = {
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar,
      };

      // DASH-001: Memorizza solo i campi essenziali per ridurre drasticamente la dimensione della sessione in MongoDB
      req.session.guilds = Array.isArray(rawGuilds)
        ? rawGuilds.map((g) => ({
            id: g.id,
            name: g.name,
            icon: g.icon,
            owner: g.owner,
            permissions: g.permissions,
          }))
        : [];

      res.redirect("/");
    } catch (error) {
      console.error("❌ Errore autenticazione callback Discord:", error.message);
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

  // API Recupero Impostazioni e Dati Server
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

    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id) // Escludi @everyone
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
      }));

    const me = guild.members ? guild.members.me : null;
    let serverAvatarUrl = null;
    let serverBannerUrl = null;

    if (me && me.avatar) {
      serverAvatarUrl = me.avatarURL({ extension: "png", size: 256 });
    }

    // Tenta di recuperare dettagli avatar e banner per-server del bot via REST
    try {
      const memberRaw = await client.rest.get(Routes.guildMember(targetGuildId, client.user.id));
      if (memberRaw) {
        if (memberRaw.banner) {
          serverBannerUrl = client.rest.cdn.guildMemberBanner(targetGuildId, client.user.id, memberRaw.banner, { extension: "png", size: 512 });
        }
        if (memberRaw.avatar && !serverAvatarUrl) {
          serverAvatarUrl = client.rest.cdn.guildMemberAvatar(targetGuildId, client.user.id, memberRaw.avatar, { extension: "png", size: 256 });
        }
      }
    } catch (e) {
      // Ignora errori non bloccanti nel recupero dettagli REST
    }

    const defaultAvatarUrl = client.user ? client.user.displayAvatarURL({ extension: "png", size: 256 }) : "/images/avatar.gif";

    const botInfo = {
      id: client.user ? client.user.id : "",
      username: client.user ? client.user.username : "J.A.R.V.I.S.",
      nickname: me ? me.nickname || "" : "",
      defaultAvatarUrl,
      serverAvatarUrl,
      avatarUrl: serverAvatarUrl || defaultAvatarUrl,
      serverBannerUrl: serverBannerUrl || null
    };

    const stats = {
      memberCount: guild.memberCount || 0,
      channelCount: guild.channels.cache.size || 0,
      roleCount: guild.roles.cache.size || 0
    };

    res.json({
      currentConfig: guildConfig,
      channels,
      roles,
      botInfo,
      stats
    });
  });

  // API Salvataggio Impostazioni per-server (MongoDB)
  app.post("/api/settings/:guildId?", ensureAuthenticated, ensureGuildAdminApi, async (req, res) => {
    const targetGuildId = req.params.guildId || req.query.guildId;
    const guild = client.guilds.cache.get(targetGuildId);

    // Whitelist dei campi consentiti per evitare Mass Assignment (ALTA-06)
    const settingsWhitelist = [
      'welcomeChannelId', 'goodbyeChannelId', 'welcomeMessageText', 'goodbyeMessageText',
      'levelUpChannelId', 'levelUpMessageText', 'totalChannelId', 'usersChannelId', 'botsChannelId',
      'newMemberRoleId', 'botRoleId', 'inviteLink', 'botNickname', 'features', 'commands'
    ];
    
    const updatedSettings = {};
    for (const key of settingsWhitelist) {
      if (req.body[key] !== undefined) {
        updatedSettings[key] = req.body[key];
      }
    }

    try {
      let profileNotice = null;

      // Aggiornamento Profilo Bot nel Server (Nickname, Avatar, Banner per-server)
      if (guild && guild.members && guild.members.me) {
        const patchMe = {};
        let hasProfileChanges = false;

        // 1. Nickname
        if (req.body.botNickname !== undefined) {
          const trimmedNick = typeof req.body.botNickname === 'string' ? req.body.botNickname.trim() : '';
          const currentNick = guild.members.me.nickname || '';
          if (trimmedNick !== currentNick) {
            if (guild.members.me.permissions.has("ChangeNickname")) {
              patchMe.nick = trimmedNick || null;
              hasProfileChanges = true;
            } else {
              profileNotice = "Il bot non ha il permesso 'Cambia Nickname' in questo server.";
            }
          }
        }

        // 2. Avatar (stringa Data URI Base64, oppure null per reset)
        if (req.body.botAvatar !== undefined) {
          if (req.body.botAvatar === null) {
            patchMe.avatar = null;
            hasProfileChanges = true;
          } else if (typeof req.body.botAvatar === 'string' && req.body.botAvatar.startsWith('data:image/')) {
            patchMe.avatar = req.body.botAvatar;
            hasProfileChanges = true;
          }
        }

        // 3. Banner (stringa Data URI Base64, oppure null per reset)
        if (req.body.botBanner !== undefined) {
          if (req.body.botBanner === null) {
            patchMe.banner = null;
            hasProfileChanges = true;
          } else if (typeof req.body.botBanner === 'string' && req.body.botBanner.startsWith('data:image/')) {
            patchMe.banner = req.body.botBanner;
            hasProfileChanges = true;
          }
        }

        if (hasProfileChanges) {
          try {
            await client.rest.patch(Routes.guildMember(targetGuildId), { body: patchMe });
            console.log(`🤖 Profilo bot aggiornato sul server [${targetGuildId}] (nick: ${patchMe.nick !== undefined}, avatar: ${patchMe.avatar !== undefined}, banner: ${patchMe.banner !== undefined})`);
          } catch (profileErr) {
            console.warn(`⚠️ Errore aggiornamento profilo bot per [${targetGuildId}]:`, profileErr.message);
            // Se fallisce per via del banner (richiede Nitro/boost o permessi), riprova applicando nick e avatar
            if (patchMe.banner !== undefined && (patchMe.avatar !== undefined || patchMe.nick !== undefined)) {
              const fallbackPatch = {};
              if (patchMe.nick !== undefined) fallbackPatch.nick = patchMe.nick;
              if (patchMe.avatar !== undefined) fallbackPatch.avatar = patchMe.avatar;
              try {
                await client.rest.patch(Routes.guildMember(targetGuildId), { body: fallbackPatch });
                profileNotice = "Avatar e nickname salvati con successo. (Nota: Il banner personalizzato richiede requisiti di potenziamento/Nitro sul server Discord).";
              } catch (fallbackErr) {
                profileNotice = `Avviso profilo Discord: ${fallbackErr.message}`;
              }
            } else {
              profileNotice = `Avviso profilo Discord: ${profileErr.message}`;
            }
          }
        }
      }

      await updateGuildConfig(targetGuildId, updatedSettings);
      console.log(`⚙️ Impostazioni aggiornate per il server [${targetGuildId}] via Web Dashboard!`);
      res.json({
        message: "Impostazioni applicate e salvate su MongoDB con successo.",
        profileNotice
      });
    } catch (error) {
      console.error("Errore salvataggio impostazioni:", error);
      res.status(500).json({ message: "Impossibile salvare le impostazioni: " + error.message });
    }
  });

  // API Reaction Roles: Lista per-server
  app.get("/api/reaction-roles/:guildId", ensureAuthenticated, ensureGuildAdminApi, async (req, res) => {
    const targetGuildId = req.params.guildId;
    try {
      if (!ReactionRoleModel) return res.json([]);
      const roles = await ReactionRoleModel.find({ guildId: targetGuildId }).lean();
      res.json(roles || []);
    } catch (err) {
      res.status(500).json({ message: "Errore caricamento reaction roles: " + err.message });
    }
  });

  // API Reaction Roles: Aggiunta / Creazione
  app.post("/api/reaction-roles/:guildId", ensureAuthenticated, ensureGuildAdminApi, async (req, res) => {
    const targetGuildId = req.params.guildId;
    const { channelId, messageId, title, rolesMap } = req.body;

    if (!channelId || !messageId || !rolesMap || typeof rolesMap !== 'object') {
      return res.status(400).json({ message: "Dati mancanti: channelId, messageId e rolesMap sono obbligatori." });
    }

    try {
      await addReactionRole(targetGuildId, channelId, messageId, rolesMap, title || "");
      
      // Prova ad aggiungere le reazioni al messaggio Discord se presente
      const guild = client.guilds.cache.get(targetGuildId);
      if (guild) {
        const channel = guild.channels.cache.get(channelId);
        if (channel && channel.isTextBased()) {
          const msg = await channel.messages.fetch(messageId).catch(() => null);
          if (msg) {
            for (const emoji of Object.keys(rolesMap)) {
              await msg.react(emoji).catch(() => {});
            }
          }
        }
      }

      res.json({ message: "Reaction Role salvato con successo." });
    } catch (err) {
      res.status(500).json({ message: "Errore salvataggio reaction role: " + err.message });
    }
  });

  // API Reaction Roles: Eliminazione
  app.delete("/api/reaction-roles/:guildId/:id", ensureAuthenticated, ensureGuildAdminApi, async (req, res) => {
    const targetGuildId = req.params.guildId;
    const id = req.params.id;
    try {
      if (!ReactionRoleModel) return res.status(500).json({ message: "Modello non disponibile." });
      
      const doc = await ReactionRoleModel.findOne({ _id: id, guildId: targetGuildId });
      if (!doc) {
        return res.status(404).json({ message: "Reaction Role non trovato." });
      }

      await removeReactionRole(doc.channelId, doc.messageId);
      res.json({ message: "Reaction Role eliminato con successo." });
    } catch (err) {
      res.status(500).json({ message: "Errore eliminazione reaction role: " + err.message });
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
      const operations = [];
      let addedCount = 0;
      let updatedCount = 0;

      allMembers.forEach((member) => {
        if (member.user.bot) return;
        const userId = member.id;
        const username = member.user.username;

        if (!xpData[userId]) {
          xpData[userId] = { xp: 0, level: 0, username };
          addedCount++;
        } else {
          xpData[userId].username = username;
          updatedCount++;
        }

        operations.push({
          updateOne: {
            filter: { guildId: targetGuildId, userId },
            update: {
              $set: { username },
              $setOnInsert: { xp: 0, level: 0 }
            },
            upsert: true
          }
        });
      });

      const { isDBConnected } = require("../misc/database.js");
      const UserXPModel = require("../models/UserXP.js");

      if (isDBConnected() && UserXPModel && operations.length > 0) {
        await UserXPModel.bulkWrite(operations);
      }

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

  // API Analytics per Grafici Storici Attività (IDEA-004)
  const GuildActivityModel = require("../models/GuildActivity.js");

  app.get("/api/guilds/:guildId/analytics", ensureAuthenticated, ensureGuildAdminApi, async (req, res) => {
    try {
      const targetGuildId = req.params.guildId;
      const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 30);

      const activities = await GuildActivityModel.find({ guildId: targetGuildId })
        .sort({ date: -1 })
        .limit(days)
        .lean();

      // Mappa per data
      const mapByDate = new Map();
      activities.forEach(a => mapByDate.set(a.date, a));

      const labels = [];
      const messages = [];
      const voiceHours = [];
      const activeUsers = [];
      const xpGained = [];

      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const act = mapByDate.get(dateStr);

        const label = d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
        labels.push(label);
        messages.push(act ? act.messages : 0);
        voiceHours.push(act ? +(act.voiceMinutes / 60).toFixed(1) : 0);
        activeUsers.push(act && Array.isArray(act.activeUsers) ? act.activeUsers.length : 0);
        xpGained.push(act ? act.xpGained : 0);
      }

      res.json({
        success: true,
        days,
        labels,
        messages,
        voiceHours,
        activeUsers,
        xpGained
      });
    } catch (error) {
      console.error("Errore API analytics:", error.message);
      res.status(500).json({ success: false, message: "Errore nel caricamento delle analytics." });
    }
  });

  // Avvio Server Web
  app.listen(PORT, () => {
    console.log(`🚀 Web Dashboard attiva su http://localhost:${PORT}`);
  });
};
