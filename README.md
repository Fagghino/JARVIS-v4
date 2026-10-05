<div align="center">
  <img src="Docs/assets/image/banner.png" alt="JARVIS Banner" width="100%" style="border-radius: 16px;" />
  <br/><br/>
  <img src="Docs/assets/image/avatar.gif" alt="JARVIS Avatar" width="140" height="140" style="border-radius: 50%; border: 4px solid #3498db; margin-top: -70px; box-shadow: 0 12px 36px rgba(0,0,0,0.6);" />
  <br/><br/>
  <h1>🤖 J.A.R.V.I.S. Discord Bot</h1>
  <p><b>The Ultimate Multi-Server Discord Automation Suite & Interactive Web Dashboard</b></p>

  <p>
    <a href="https://github.com/Fagghino/JARVIS-v4"><img src="https://img.shields.io/badge/Version-v4.5.3-blue?style=for-the-badge&logo=discord&logoColor=white" alt="Version"></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-16.x%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"></a>
    <a href="https://discord.js.org/"><img src="https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js"></a>
    <a href="https://www.mongodb.com/cloud/atlas"><img src="https://img.shields.io/badge/Database-MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License"></a>
  </p>

  <p>
    <a href="README.md"><b>🇺🇸 English Documentation</b></a> • 
    <a href="Docs/README.it.md"><b>🇮🇹 Documentazione Italiana</b></a> • 
    <a href="Docs/CHANGELOG.en.md"><b>📜 Changelog (v4.5.3)</b></a>
  </p>
</div>

---

## 📌 Complete System Overview

**J.A.R.V.I.S.** is a complete, all-in-one **Multi-Server (Multi-Guild)** Discord bot ecosystem designed for community engagement, moderation, automation, and analytics. Powered by **Node.js**, **Discord.js v14**, **MongoDB Atlas Cloud**, and **Express.js**, JARVIS delivers a comprehensive suite of features ranging from text/voice XP leveling systems to reaction role menus, dynamic voice channel counters, instant multi-language translation, moderation utilities, and a role-gated Web Dashboard.

---

## 🌟 Core Modules & Capabilities

### 🏆 1. Advanced XP & Leveling Engine
- **Text Activity XP**: Earns **+10 XP** for every text message sent in server channels (with anti-spam buffer).
- **Voice Channel Activity XP**: Earns **+5 XP every 30 seconds** for members actively present in voice channels (`handleVoiceXP`).
- **Mathematical Leveling Progression**: Levels are dynamically calculated using the formula:
  $$\text{Level} = \lfloor 0.1 \times \sqrt{\text{XP}} \rfloor$$
- **Level-Up Embed Alerts**: Sends customizable rich embed notifications to designated level-up channels whenever a member reaches a new milestone.
- **In-Memory Caching & Cloud Flush**: Manages XP updates in high-speed RAM cache (`xpCache`) and periodically flushes updates to MongoDB Atlas to maximize performance and avoid API throttling.
- **Leaderboard Integration**: View server rankings directly on Discord via `/classifica` or on the Web Dashboard.

---

### 👋 2. Welcome & Goodbye Automations
- **Rich Embed Arrival Notices**: Welcomes new members with a customized light-blue embed (`0x3498db`) featuring their Discord avatar thumbnail, account creation age, and updated guild member count.
- **Farewell Embed Notices**: Logs member departures with a customized red embed (`0xe74c3c`).
- **Automated Role Assignment**: Automatically assigns default member roles upon joining, with distinct handling for human users versus automated bot accounts (`newMemberRoleId` & `botRoleId`).

---

### 📊 3. Dynamic Voice Channel Member Counters
- **Live Server Metrics**: Automatically creates and renames dedicated voice channels to display:
  1. 👥 **Total Members Count** (`totalChannelId`)
  2. 👤 **Human Users Count** (`usersChannelId`)
  3. 🤖 **Bots Count** (`botsChannelId`)
- **Discord Rate-Limit Protection**: Updates channel names every 10 minutes with a sequential queue buffer to respect Discord's strict 2-renames-per-10-minutes API limits.

---

### 🎭 4. Reaction Roles Engine
- **Interactive Menu Wizard**: Set up role selection menus with `/reaction-roles` and `/reaction-roles-add`.
- **Multi-Pairing Support**: Map up to 10 emoji-role pairs per message supporting both custom Discord emojis and standard Unicode emojis.
- **Partials Support**: Uses Discord.js Partials (`Message`, `Channel`, `Reaction`, `User`, `GuildMember`) to ensure reaction role add/remove events function seamlessly even after bot restarts or for older un-cached messages.
- **Persistent Storage**: Mapped emoji-role pairs and message IDs are stored permanently on MongoDB Cloud.

---

### 🛡️ 5. Administrative & Moderation Toolset
- **`/clear [amount]`**: Bulk deletes 1 to 50 messages in the current channel with real-time deletion verification (enforces Discord's 14-day age limit).
- **`/embed [title] [text]`**: Interactive custom embed builder supporting custom titles, body text, colors, and footers.
- **`/set [key] [value]`**: Configure server channels (welcome, goodbye, level-up, counters) and default roles dynamically without restarting.
- **`/sync-members`**: Synchronizes all guild members with MongoDB Atlas to ensure complete database records.
- **`/invita`**: Generates or retrieves permanent server invite links with dynamic fallback creation.
- **`/help_admin`**: Dedicated administrator command guide and permission verification.

---

### 🌍 6. Public Utilities & Community Mini-Games
- **`/traduci [text]`**: Instant multi-language translation powered by DeepL API and Google Translate API with automatic fallback.
- **`/userinfo [user]`**: Displays in-depth profile details (avatar, join date, account creation date, guild roles list).
- **`/server`**: Displays comprehensive server statistics (owner, creation date, boost tier, text/voice channels count).
- **`/ping`**: Measures real-time WebSocket and Discord REST API latency.
- **`/roll [sides]`**: Rolls an N-sided custom dice (defaults to 6 sides).
- **`/flip`**: Flips a coin returning a random *Heads* or *Tails* result.
- **`/help`**: Interactive public user guide.

---

### 🌐 7. Interactive Express Web Dashboard
- **Discord OAuth2 Login**: Secure user authentication via Discord's official OAuth2 identification.
- **Per-Guild Permission Gating**: Guild selector screen (`/select-guild`) automatically enables accessible servers while locking unauthorized servers in gray with `🔒 Admin permissions required`.
- **Theme Switcher**: Instant Dark Glassmorphism vs. Clean Light Mode toggle with `localStorage` persistence.
- **Language Switcher**: Instant Italian (`🇮🇹 ITA`) vs. English (`🇬🇧 ENG`) language toggle across all views.
- **Live Management**: Live memory consumption gauge, uptime counter, WebSocket ping, online guild statistics, real-time leaderboard, and runtime configuration settings.

---

### ☁️ 8. Multi-Server & Cloud-Native Architecture
- **MongoDB Atlas Cloud Persistence**: Full data isolation per Discord guild ID (`GuildSettings`, `UserXP`, `ReactionRole`).
- **Render Free Tier Ready**: Volatile filesystem safe — no hardcoded credentials or local state storage.
- **Keep-Alive Ready**: Fully compatible with UptimeRobot HTTP(s) pinging to prevent instance sleep.

---

## 🎮 Complete Slash Commands Reference

### 👤 Public Commands

| Command | Description | Usage / Details |
| :--- | :--- | :--- |
| `/help` | Display public commands guide | Interactive command overview |
| `/classifica` | View server XP & Level leaderboard | Paginated rankings sorted by level & XP |
| `/ping` | Check bot & API WebSocket latency | Displays latency in milliseconds |
| `/userinfo` | Display user profile details | Avatar, join date, roles list |
| `/server` | Display server statistics | Member count, boost tier, channel counts |
| `/roll` | Roll an N-sided dice | e.g. `/roll 20` for D20 roll |
| `/flip` | Flip a coin | Randomly returns Heads or Tails |
| `/traduci` | Translate text instantly | Uses DeepL & Google Translate fallback |

### 🛡️ Admin Commands

| Command | Description | Permissions Required |
| :--- | :--- | :--- |
| `/help_admin` | Display administrator help panel | Administrator |
| `/clear` | Bulk delete 1-50 messages | Administrator |
| `/embed` | Create and send a custom embed | Administrator |
| `/set` | Configure server channels and roles | Administrator / Manage Guild |
| `/invita` | Generate or fetch server invite link | Administrator |
| `/reaction-roles` | Reaction role wizard setup | Administrator |
| `/reaction-roles-add` | Append emoji-role pairs to existing menu | Administrator |
| `/sync-members` | Sync guild members with database | Administrator |

---

## 📦 Requirements

- **Node.js**: `16.x` or higher
- **npm**: `8.x` or higher
- **Discord Application**: Bot Token & OAuth2 Client Secret from [Discord Developer Portal](https://discord.com/developers/applications)
- **Database**: Free MongoDB Atlas Cluster (`Free M0` tier)

---

## 🚀 Quick Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Fagghino/JARVIS-v4.git
cd JARVIS-v4
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration (`config/.env`)
Copy the template file in `config/.env.example` to `config/.env` and insert your credentials:

```env
# Discord Credentials
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_CLIENT_SECRET=your_oauth2_client_secret_here

# Web Dashboard Configuration
REDIRECT_URI=http://localhost:8080/auth/callback
SESSION_SECRET=your_random_secure_secret_string
ADMIN_ROLE_IDS=admin_role_id_1,admin_role_id_2
NODE_ENV=development

# Database Cloud Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database_name>?retryWrites=true&w=majority
```

### 4. Deploy Global Slash Commands
```bash
npm run deploy
```

### 5. Start the Application
```bash
npm start
```

---

## 🌐 Production Deployment (Render Free Tier)

1. **Connect Repository**: Create a new Web Service on [Render.com](https://render.com) connected to your GitHub repository.
2. **Environment Variables**: Add all 7 keys (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `REDIRECT_URI`, `SESSION_SECRET`, `ADMIN_ROLE_IDS`, `MONGODB_URI`) under Render *Environment Variables*.
3. **MongoDB Whitelist**: In MongoDB Atlas -> *Security* -> *Network Access*, add `0.0.0.0/0` (Allow Access from Anywhere - Permanent).
4. **Discord OAuth2 Redirect**: In Discord Developer Portal -> *OAuth2* -> *Redirects*, add `https://your-app.onrender.com/auth/callback`.
5. **UptimeRobot Keep-Alive**: Add a free HTTP(s) monitor on [UptimeRobot.com](https://uptimerobot.com) targeting `https://your-app.onrender.com/` every 5 minutes.

---

## 🗂️ Project Structure

```text
JARVIS-v4/
├── index.js                          # Main bot entry point & client initialization
├── deploy-commands.js                # Global slash command deployment script
├── package.json                      # Project dependencies & scripts
├── config/
│   ├── .env.example                  # Environment variables template file
│   └── config.js                     # Global default fallback configurations
├── models/                           # Mongoose Schemas (MongoDB Atlas)
│   ├── GuildSettings.js              # Per-guild settings schema
│   ├── ReactionRole.js               # Reaction roles & emoji mapping schema
│   └── UserXP.js                     # User XP & level schema
├── dashboard/                        # Express Web Dashboard
│   ├── server.js                     # Express server, OAuth2 & per-guild APIs
│   ├── public/                       # Static assets
│   │   ├── css/style.css             # Glassmorphism dark/light CSS stylesheet
│   │   └── js/theme-lang.js          # Theme toggle & i18n frontend script
│   └── views/                        # HTML5 templates
│       ├── login.html                # Discord OAuth2 login page
│       ├── dashboard.html            # Main status & stats view
│       ├── select-guild.html         # Guild selector with permission locking
│       ├── leaderboard.html          # Dynamic server XP leaderboard
│       ├── settings.html             # Per-guild admin settings panel
│       └── unauthorized.html         # Access denied view
├── commands/                         # Slash Commands
│   ├── admin/                        # Admin-only commands
│   └── public/                       # Public user commands
├── misc/                             # Core Bot Handler Modules
│   ├── database.js                   # Mongoose connection handler
│   ├── level.js                      # Voice & text XP tracker with in-memory flush
│   ├── reactionRoles.js              # Reaction add/remove event handlers
│   ├── welcome.js                    # Member join/leave embed notifications
│   └── counter.js                    # Auto-updating voice channel counters
├── scripts/                          # Utility & Migration Scripts
│   ├── migrateSheetsToMongo.js       # Historical data migration (Google Sheets -> MongoDB)
│   └── clearGuildCommands.js         # Script to clear duplicate guild commands
├── utils/                            # Shared Utilities
│   ├── cooldown.js                   # User command rate-limiting manager
│   ├── guildSettings.js              # MongoDB settings helper & cache
│   ├── loadCommands.js               # Shared recursive slash command loader
│   ├── logger.js                     # ISO timestamp structured logger
│   ├── parseEmoji.js                 # Shared Discord custom & unicode emoji parser
│   └── translator.js                 # DeepL & Google Translation API wrapper
└── Docs/                             # Project Documentation
    ├── README.it.md                  # Italian documentation
    ├── CHANGELOG.en.md               # English changelog
    └── CHANGELOG.it.md               # Italian changelog
```

---

## 🔨 npm Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm start` | `node index.js` | Run the bot & Web Dashboard in production mode |
| `npm run dev` | `nodemon index.js` | Run in development mode with auto-reload |
| `npm run deploy` | `node deploy-commands.js` | Deploy global slash commands to Discord API |
| `npm run migrate` | `node scripts/migrateSheetsToMongo.js` | Migrate legacy Google Sheets data to MongoDB |
| `npm run test` | `node --check ...` | Run syntax verification across all codebase files |

---

## ❓ FAQ & Troubleshooting

<details>
<summary><b>1. MongoServerSelectionError / ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR on Render</b></summary>
<br/>
This occurs when MongoDB Atlas blocks incoming connections from Render's cloud IP addresses. Go to MongoDB Atlas -> <i>Security</i> -> <i>Network Access</i>, click <b>+ Add IP Address</b>, click <b>ALLOW ACCESS FROM ANYWHERE</b> (<code>0.0.0.0/0</code>), set it to <b>Permanent</b>, and click <b>Confirm</b>.
</details>

<details>
<summary><b>2. Slash commands appear twice on Discord</b></summary>
<br/>
This happens if both Guild-specific commands and Global commands were registered for the same server. Run <code>node scripts/clearGuildCommands.js &lt;guildId&gt;</code> to clear duplicate guild commands, then refresh Discord with <code>CTRL + R</code>.
</details>

<details>
<summary><b>3. ERR_TOO_MANY_REDIRECTS on the Web Dashboard</b></summary>
<br/>
Ensure your <code>REDIRECT_URI</code> environment variable matches your exact primary Render URL (e.g. <code>https://your-app.onrender.com/auth/callback</code>) both on Render and in Discord Developer Portal -> <i>OAuth2</i> -> <i>Redirects</i>.
</details>

---

<hr/>

<div align="center">
  <img src="Docs/assets/image/avatar.png" width="60" height="60" style="border-radius: 50%; opacity: 0.9;" />
  <br/><br/>
  <p><b>J.A.R.V.I.S. Discord Bot & Web Dashboard</b> • Crafted with ❤️ by <a href="https://github.com/Fagghino"><b>Fagghino</b></a></p>
  <p>
    <a href="#top">⬆️ Back to Top</a> • 
    <a href="LICENSE">📄 MIT License</a> • 
    <a href="Docs/CHANGELOG.en.md">📜 Version History (v4.5.3)</a>
  </p>
</div>
