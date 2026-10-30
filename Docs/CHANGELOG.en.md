# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.5.4] - 2026-10-29

### Added
- **Admin `/sito` Slash Command**:
  - `commands/admin/sito.js`: Added an administrator-only slash command with permission checks (`PermissionFlagsBits.Administrator`), informational embed, and an interactive button linking directly to the official Render Web Dashboard (`https://jarvis-v5-cto5.onrender.com/`).
- **Web Dashboard Graphic Assets**:
  - `dashboard/public/images/banner.png`: Integrated the official JARVIS header banner asset for the web dashboard.
- **Official Landing Page & Complete Redesign**:
  - `dashboard/public/css/landing.css`: New dedicated, high-performance stylesheet for the landing page with Bento Grid modular architecture, 60fps animations, native Discord component mockups (chat channel, embeds with bot badges, rank cards, interactive role buttons), and Arc Reactor cyan/azure palette.
  - `dashboard/views/landing.html`: New template for the public bot homepage (`/`), featuring:
    - Sticky glassmorphic navbar with a hover/click dropdown mega-menu ("Funzionalità") listing all 8 core bot modules for instant preview.
    - Centered Hero section with strictly left-aligned copy and dual call-to-action buttons ("Aggiungi a Discord" & "Funzioni ↓"), accompanied by a 3D glass card showcase with official banner and floating status badges.
    - Bento Grid section with functional toggle switches and click-to-preview triggers.
    - Interactive modal popup with a live Discord mockup window displaying real-time demonstrations for all 8 modules (Levels & XP, Moderation, Reaction Roles, Welcome & Goodbye, Web Dashboard, Google Translator, Voice Counters, 17 Slash Commands).
    - Dedicated cloud dashboard preview, transparent feature comparison table, accordion FAQ, and comprehensive footer.
- **Dedicated `/dashboard` Route**:
  - `dashboard/server.js`: Created explicit `GET /dashboard` route for authenticated access to internal system health and bot runtime metrics (uptime, heap memory, WebSocket ping, connection status).

### Changed
- **Web Dashboard Navigation & Routing**:
  - `dashboard/server.js`: Reengineered main `GET /` route to deliver the public landing page to all visitors with dynamic user action injection (single "Accedi con Discord" button for guests, user profile widget with server & status links for logged-in users).
  - `dashboard/server.js`: Optimized post-login OAuth2 redirection (`GET /auth/callback`) to directly open the server selector (`/select-guild`).
  - `dashboard/server.js`: Added convenient top-bar navigation shortcuts (`🏠 Home`, `⚙️ Server`, `📊 Stato`) across all internal pages.
  - `dashboard/views/login.html`: Updated to match and serve the new unified modular landing page.
- **Web Dashboard Aesthetic Redesign**:
  - `dashboard/public/css/style.css`: Shifted theme accent colors from legacy orange/yellow (`#ff8c00`) to an Arc Reactor Cyan & Azure sci-fi palette (`#00b4d8`, `#38bdf8`, `#0077b6`, and gradient `linear-gradient(135deg, #00d2ff 0%, #0077b6 100%)`).
  - `dashboard/public/css/style.css`: Introduced `.banner-wrapper` with gradient fade overlay and Discord Nitro profile header style avatar overlap (`.avatar-container`).
  - `dashboard/public/css/style.css`: Upgraded stats cards with smooth hover elevation and cyan neon glow (`box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3), 0 0 18px rgba(0, 180, 216, 0.15)`).
  - `dashboard/public/css/style.css`: Modernized primary action buttons with cyan gradient and metallic glows for top 3 leaderboard ranks (Gold, Silver, Amber).
  - `dashboard/public/css/style.css`: Calibrated contrast, borders, and banner overlays for light theme compatibility (*Light Mode*).
  - `dashboard/views/dashboard.html`: Integrated edge-to-edge banner header and thematic micro-icons across all metric cards (🌐 Web Server, 🤖 Discord Connection, 🛡️ Active Servers, ⚡ Uptime, 📶 Ping, 🧠 Memory).
  - `dashboard/views/leaderboard.html`: Updated loading spinner and visual accents to cyan theme.
  - `dashboard/views/select-guild.html`: Updated active guild card hover elevation to cyan theme.
  - `dashboard/views/settings.html`: Harmonized loading spinners and form controls to cyan theme.

## [4.5.3] - 2026-10-05

### Security
- **Web Dashboard Authentication & Sessions**:
  - `dashboard/server.js`: Removed hardcoded session secret fallback; `SESSION_SECRET` is now strictly validated and required across the bot lifecycle.
  - `dashboard/server.js`: Added cryptographic `state` parameter generation, session storage, and validation in Discord OAuth2 login flow (`/auth/login` and `/auth/callback`) to protect against CSRF attacks.
  - `dashboard/server.js`: Hardened session cookies with `httpOnly: true` and `sameSite: 'lax'` to mitigate client-side script cookie access and cross-site request forgery.
- **Access Control & API Authorization**:
  - `dashboard/server.js`: Implemented `ensureGuildAdminApi` middleware on `GET /api/settings/:guildId` to restrict settings access strictly to server administrators and server owners.
  - `dashboard/server.js`: Implemented `ensureGuildMemberApi` middleware on `GET /api/leaderboard/:guildId` to verify actual server membership directly against Discord guild cache, rejecting unauthorized non-members with 403 Forbidden.
- **HTTP Headers & Traffic Protection**:
  - `dashboard/server.js`: Integrated `helmet` middleware with tailored Content Security Policy (CSP) allowing required inline scripts, styles, and Discord CDN assets.
  - `dashboard/server.js`: Integrated `express-rate-limit` to rate-limit authentication routes (`/auth/*`, 10 req/15 min) and API endpoints (`/api/*`, 60 req/min).
  - `dashboard/server.js`: Added middleware enforcing `Content-Type: application/json` on all `POST /api/*` routes.
  - `dashboard/server.js`: Enforced body payload size limit (`express.json({ limit: '10kb' })`) to prevent request flooding and memory exhaustion.
  - `dashboard/server.js`: Implemented strict payload whitelisting on `POST /api/settings/:guildId` to eliminate mass assignment vulnerabilities.
- **XSS & Template Sanitization**:
  - `dashboard/server.js`: Implemented `escapeHtml` utility and applied sanitization across `renderTemplate`, `getUserBarHtml`, and all dynamic template variables (`user.username`, `bg.name`, `guildName`, `req.guild.name`).
  - `dashboard/views/leaderboard.html`: Replaced innerHTML concatenation with safe `textContent` assignment for user-supplied usernames to prevent DOM-based XSS.
- **Discord Slash Command Permissions**:
  - `commands/admin/clear.js`: Added `.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)` to hide the `/clear` command in the Discord interface for non-administrative members.

### Fixed
- **Bot Boot & Database Synchronization**:
  - `index.js`: Hoisted environment variable validation (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `MONGODB_URI`, `SESSION_SECRET`) to the very top of `index.js` immediately following dotenv initialization, preventing partial initialization on missing configs.
  - `index.js`: Wrapped database connection, dashboard initialization, and Discord login in an asynchronous IIFE (`await connectDB()`), ensuring MongoDB is fully connected before starting services and handling events.
- **Process Exception Handling**:
  - `index.js`: Updated `unhandledRejection` handler to log errors without abrupt process exit; configured `uncaughtException` to asynchronously flush in-memory XP cache (`flushCache()`) before terminating with code 1 for clean process manager restarts.
- **Scripts**:
  - `scripts/clearGuildCommands.js`: Removed hardcoded fallback guild ID, enforcing `guildId` as a mandatory CLI argument with usage instructions.

### Performance
- **Member Sync Optimization**:
  - `commands/admin/sync-members.js`: Eliminated N+1 sequential `UserXPModel.exists` database queries per member in favor of a single `bulkWrite` operation and computing statistics directly from `result.upsertedCount`.
- **Database Indexing**:
  - `models/UserXP.js`: Added compound index `{ guildId: 1, xp: -1 }` to optimize high-traffic leaderboard and ranking queries.

### Added
- **Emoji Parser Utility**:
  - `utils/parseEmoji.js`: Extracted duplicated emoji parsing logic into a shared helper module supporting custom and Unicode emojis.
- **Environment Documentation**:
  - `config/.env.example`: Documented `NODE_ENV` configuration with explanations for production secure cookie behavior.
- **Repository Configuration**:
  - `.gitignore`: Added `*.zip` and `*.tar.gz` to ignored patterns for temporary archives.

### Refactored
- **Code Deduplication**:
  - `commands/admin/reaction-roles.js`, `commands/admin/reaction-roles-add.js`: Refactored to import the shared `parseEmoji` utility.

## [4.5.2] - 2026-09-13

### Fixed
- **Web Dashboard & API Authorization**:
  - `dashboard/server.js`: Introduced `ensureGuildAdminApi` middleware to enforce authentication and administrator permissions on POST API routes (`/api/settings` and `/api/sync-members`), returning structured JSON error responses.
- **Public Slash Commands**:
  - `commands/public/flip.js`: Fixed coin flip outcome emoji assignment by replacing duplicate coin emoji with `👑` for "Heads".

### Changed
- **Bot Lifecycle & Core Engine**:
  - `index.js`: Renamed Express launcher from `keep_alive` to `startDashboard` and integrated async XP cache flushing (`flushCache()`) into graceful shutdown signal handlers (`SIGINT`, `SIGTERM`).
- **Documentation**:
  - `README.md`: Corrected `/clear` command message limit documentation from 1-100 to 1-50 messages to match implementation bounds.

### Removed
- **Legacy Modules**:
  - `misc/googleSheetsDB.js`: Removed deprecated v3 Google Sheets database module no longer active in runtime.

### Refactored
- **Codebase Cleanups**:
  - `misc/level.js`, `misc/reactionRoles.js`, `commands/admin/sync-members.js`: Removed redundant `dotenv.config()` calls.
  - `deploy-commands.js`: Removed unused `serverId` import.
  - `utils/cooldown.js`, `commands/admin/reaction-roles.js`, `commands/admin/reaction-roles-add.js`: Updated legacy code comments from Google Sheets / JSON files to MongoDB Cloud / Atlas.

## [4.5.1] - 2026-07-24

### Fixed
- **Administrative Slash Commands**:
  - `commands/admin/invite.js`: Fixed empty invite link in `/invita` command by implementing dynamic server invite fetching and creation fallback via Discord API.
- **Web Dashboard & Internationalization**:
  - `dashboard/server.js`: Attached `data-i18n` attributes to Discord connection status badges and server lock reason tags for dynamic language toggling.

### Added
- **Web Dashboard & Internationalization**:
  - `dashboard/public/js/theme-lang.js`: Added missing translation dictionary keys for footer text, bot version prefix, and connection status badges.
  - `config/.env.example`: Added environment variables template file.
- **Documentation & Testing**:
  - `Docs/CHECKLIST_TEST.md`: Created interactive testing checklist for verifying all bot modules and dashboard features.

### Changed
- **Web Dashboard Frontend**:
  - `dashboard/views/dashboard.html`: Attached `data-i18n` attributes for dynamic frontend translation of footer text, version string, and web server status.

## [4.5.0] - 2026-07-24

### Added
- **Documentation & Visual Branding**:
  - `README.md`: English documentation with installation guide, MongoDB setup, and dashboard instructions.
  - `Docs/README.it.md`: Official Italian documentation including multi-server architecture and slash commands overview.
  - `Docs/assets/image/*`: Visual assets including bot avatar GIFs, PNGs, and project banners.
  - `Docs/CHANGELOG.it.md` & `Docs/CHANGELOG.en.md`: Comprehensive change history adhering to Keep a Changelog v1.1.0 and Semantic Versioning.

## [4.4.0] - 2026-07-24

### Added
- **Express Web Dashboard & Interactive Frontend**:
  - `dashboard/server.js`: Integrated Express web server with Discord OAuth2 authentication, session management, and configuration/leaderboard APIs.
  - `dashboard/views/*`: Dynamic HTML5 views for Login (`login.html`), Main Dashboard (`dashboard.html`), XP Leaderboard (`leaderboard.html`), Guild Selection (`select-guild.html`), Settings (`settings.html`), and Unauthorized Error (`unauthorized.html`).
  - `dashboard/public/css/style.css`: Custom CSS stylesheet with dark mode and modern glassmorphism design.
  - `dashboard/public/js/theme-lang.js`: Frontend script for dynamic theme toggling (light/dark) and internationalization (Italian/English).
  - `dashboard/public/images/avatar.gif`: Default bot avatar asset for the web dashboard interface.

## [4.3.0] - 2026-07-24

### Added
- **System Utilities & Event Handlers**:
  - `utils/logger.js`: Structured logging utility with ISO timestamps and severity levels (`INFO`, `WARN`, `ERROR`).
  - `utils/cooldown.js`: Rate limiting and user command cooldown manager.
  - `utils/translator.js`: Centralized translation module with automatic fallback (DeepL API & Google Cloud Translation).
  - `utils/guildSettings.js`: Utility helper for retrieving and managing multi-server settings on MongoDB.
  - `utils/loadCommands.js`: Shared recursive loader for dynamic slash command initialization.
- **Bot Logic Modules**:
  - `misc/counter.js`: Member counter voice channel auto-update system.
  - `misc/level.js`: User XP experience tracker for text messages and voice channel activity with level-up notifications.
  - `misc/reactionRoles.js`: Reaction add/remove event handler for automatic role assignments.
  - `misc/welcome.js`: Rich embed notifications for member welcome and goodbye events.

## [4.2.0] - 2026-07-23

### Added
- **Public Commands & Mini-Games**:
  - `commands/public/flip.js`: Coin flip slash command (Heads or Tails).
  - `commands/public/roll.js`: N-sided dice roll slash command.
  - `commands/public/userinfo.js`: Slash command to display detailed guild member information.
  - `commands/public/ping.js`: Command to measure bot API and Discord WebSocket latency.
  - `commands/public/help.js`: Interactive user guide for public commands.
  - `commands/public/serverinfo.js`: Complete guild statistics slash command.
  - `commands/public/traduci.js`: Instant text translation slash command.
  - `commands/public/classifica.js`: Interactive XP level member leaderboard.

## [4.1.0] - 2026-07-22

### Added
- **Administrative Commands & Moderation**:
  - `commands/admin/reaction-roles-add.js`: Sub-command for quickly adding individual emoji-role pairs.
  - `commands/admin/sync-members.js`: Manual member and role synchronization command with MongoDB.
  - `commands/admin/clear.js`: Bulk message deletion command with Discord API validation.
  - `commands/admin/embed.js`: Custom embed message generator slash command.
  - `commands/admin/helpAdmin.js`: Admin-only command guide panel.
  - `commands/admin/invite.js`: Secure invite link generator for the bot.
  - `commands/admin/reaction-roles.js`: Reaction roles setup and configuration panel.
  - `commands/admin/set.js`: Quick guild channel and role configuration slash command.

## [4.0.0] - 2026-07-21

### Added
- **MongoDB Architecture & Cloud Persistence**:
  - `misc/database.js`: Mongoose connection handler for MongoDB Atlas Cloud.
  - `models/GuildSettings.js`: Mongoose schema for storing per-guild configurations.
  - `models/ReactionRole.js`: Mongoose schema for managing reaction roles and associated messages.
  - `models/UserXP.js`: Mongoose schema for user XP and level persistence.
  - `scripts/migrateSheetsToMongo.js`: Automated script to migrate historical data from Google Sheets to MongoDB Cloud.
  - `misc/googleSheetsDB.js`: Interoperability helper for Google Sheets API.
- **Configuration & Deployment**:
  - `.gitattributes` & `.gitignore`: Git tracking rules and environment secret protection.
  - `package.json` & `package-lock.json`: Project manifest and lockfile definitions.
  - `config/config.js`: Central global configuration defaults.
  - `deploy-commands.js`: Global slash command deployment script using Discord REST API v10.
  - `index.js`: Main entrypoint for Discord bot client initialization and concurrent module execution.

## [3.4.7] - 2026-07-20

### Added
- **Dynamic Web Dashboard**:
  - `dashboard/server.js`: Express web server with Discord OAuth2 authentication, runtime configuration management, and leaderboard API (replaces `keep_alive.js`).
  - `dashboard/views/*`: New interactive HTML/CSS views for login, bot statistics, real-time member leaderboard, and settings panel.
  - `config/.env`: Added environment variables for client secret, callback URI, session secret, and admin role IDs.
- **HTML Status Dashboard**:
  - `keep_alive.js` & `index.js`: Introduced an interactive HTML dashboard showing real-time statistics and Discord connection status for the bot (from commit `feat(keep-alive): introduce interactive HTML status dashboard with Discord connection details`).

### Fixed
- **Left Members in Leaderboard**:
  - `dashboard/server.js` & `commands/public/classifica.js`: Hidden users who have left the server from the leaderboard, while keeping their data in the database.

### Changed
- **Welcome/Goodbye Embed Customization**:
  - `misc/welcome.js`: Removed timestamp from welcome embed and changed goodbye embed color to red (from commit `style(welcome): remove timestamp from welcome embed and change goodbye color to red`).
- **XP Log Cleanups**:
  - `misc/level.js`: Hidden the success logs of XP cache sync to Sheets to keep the console clean (from commit `style(level): hide success log for XP cache sync to keep console clean`).

## [3.4.6] - 2026-07-13

### Added
- **Welcome/Goodbye Embeds**:
  - `misc/welcome.js`: Converted simple text welcome and goodbye messages to rich embeds using the unified light blue color (`0x3498db`), complete with user avatar thumbnails and member counters (from commit `feat(welcome): convert welcome and goodbye messages to embeds`).

### Changed
- **Unified Embed Colors**:
  - Unified all bot embed sidebar colors to a clean light blue (`0x3498db`) for visual consistency.
  - `misc/level.js`: Updated level-up embed color from gold to light blue (from commit `style(level): unify embed color to light blue`).
  - `commands/public/traduci.js`: Updated color from bright blue to unified light blue (from commit `style(traduci): unify embed color to light blue`).
  - `commands/public/help.js`: Updated color from bright blue to unified light blue (from commit `style(help): unify embed color to light blue`).
  - `commands/public/classifica.js`: Updated color from bright blue to unified light blue (from commit `style(classifica): unify embed color to light blue`).
  - `commands/admin/reaction-roles.js`: Updated color from bright blue to unified light blue (from commit `style(reaction-roles): unify embed color to light blue`).
  - `commands/admin/helpAdmin.js`: Updated color from bright blue to unified light blue (from commit `style(helpAdmin): unify embed color to light blue`).
  - `commands/admin/embed.js`: Updated color from bright blue to unified light blue (from commit `style(embed): unify embed color to light blue`).
  - `commands/public/serverinfo.js`: Cleaned up formatting, removed comments and trailing whitespaces (from commit `style(serverinfo): format embed code and remove trailing spaces`).

## [3.4.5] - 2026-06-04

### Changed
- **Repository Configuration**:
  - `.gitignore`: Improved exclusions for temporary, OS, and IDE files, keeping secrets tracked for the private repository (from commit `chore(git): improve ignore configurations for node, os, and ides`).
  - `package.json`: Configured updated dependencies and package manager scripts (from commit `chore(deps): update dependencies and configure scripts`).
  - `package-lock.json`: Updated dependency lock file (from commit `chore(deps): lock file update`).

### Fixed
- **Configuration Comments**:
  - `config/config.js`: Added explanation and configuration comments for welcome/goodbye channels (from commit `chore(config): add comments clarifying welcome and goodbye channels`).

## [3.4.4] - 2026-06-04

### Added
- **Structured Logger**:
  - `utils/logger.js`: Introduced a centralized logging utility with ISO timestamps and severity levels (from commit `feat(logger): introduce structured logger with iso timestamps`).
- **Cooldown System**:
  - `utils/cooldown.js`: Implemented a per-user rate limiting (cooldown) system to prevent spamming heavy commands (from commit `feat(cooldown): implement command rate limiting and user cooldowns`).
- **Centralized Translator**:
  - `utils/translator.js`: Added support for stable translations via DeepL API and Google Cloud Translation API with robust fallback (from commit `feat(translator): add stable translation via deepl and google apis`).
- **Advanced Reaction Roles**:
  - `commands/admin/reaction-roles.js`: Increased configurable emoji/role pairs limit from 5 to 10 with preventive deferReply (from commit `feat(reaction-roles): increase pairs limit and add deferReply`).

### Changed
- **Translation Integration**:
  - `commands/public/traduci.js`: Integrated the new stable translator module for translation commands (from commit `refactor(traduci): integrate new stable translator module`).

## [3.4.3] - 2026-06-04

### Changed
- **Command Initialization**:
  - `utils/loadCommands.js`: Created a shared utility for recursive slash commands loading to eliminate code duplication (from commit `refactor(loader): share command loading logic between startup and deploy`).
  - `deploy-commands.js`: Updated the script to use the shared loader and configured auto-invocation when executed directly (from commit `refactor(deploy): update command loader and auto-invoke on direct execution`).
  - `index.js`: Integrated the shared command loader, the cooldown system, and robust interaction error handling (from commit `refactor(index): integrate shared loader, cooldowns, and robust error handling`).
- **Sheets Database Management**:
  - `misc/googleSheetsDB.js`: Optimized Google Sheets API calls and added generic public raw methods (from commit `refactor(db): optimize API usage and add generic raw methods`).
  - `misc/reactionRoles.js`: Moved Sheets operations into public database methods to remove direct sheets property access (from commit `refactor(reaction-roles): remove direct sheets access and use public DB methods`).

## [3.4.2] - 2026-06-04

### Fixed
- **Administrative Commands**:
  - `commands/admin/clear.js`: Corrected slash command output to show the actual number of deleted messages (from commit `fix(clear): show actual number of deleted messages`).
  - `commands/admin/embed.js`: Added validation for maximum Discord-allowed lengths for embed titles and descriptions (from commit `fix(embed): validate title and description maximum length`).
  - `commands/admin/helpAdmin.js`: Added administrator permission check to protect the `/help_admin` command (from commit `fix(help-admin): secure command with admin permission checks`).
  - `commands/admin/invite.js`: Added administrator permission check to protect the `/invita` command (from commit `fix(invite): secure command with admin permission checks`).
  - `commands/admin/set.js`: Added user filter to the options collector and fixed configuration keys mapping (from commit `fix(set): add user filter to collector and improve key validation`).

## [3.4.1] - 2026-06-04

### Fixed
- **Public Commands**:
  - `commands/public/ping.js`: Corrected output to show actual Discord API WebSocket latency instead of a random number (from commit `fix(ping): report real latency instead of random value`).
  - `commands/public/classifica.js`: Added deferReply to prevent timeouts and protected collector end block from message deletion errors (from commit `fix(classifica): add deferReply and handle collector end error`).
  - `commands/public/serverinfo.js`: Added JSDoc and manual member fetching to obtain updated statistics (from commit `fix(serverinfo): fetch guild members and add jsdoc documentation`).
  - `commands/public/help.js`: Removed residue debug logs in production (from commit `chore(help): remove production debug logging`).
- **Integrations and Logics**:
  - `misc/level.js`: Resolved XP save state race conditions and reduced Sheets API requests for voice channel users via in-memory caching (from commit `fix(level): resolve XP race condition using in-memory cache and flush`).
  - `misc/welcome.js`: Added missing awaits to welcome/goodbye messages to properly capture missing permissions errors (from commit `fix(welcome): await send calls to handle missing permission errors`).
  - `misc/counter.js`: Increased member counter voice channel renaming interval to 10 minutes to respect Discord rate limits (from commit `fix(counter): increase update interval to avoid discord rate limits`).
- **Code Style Cleanups**:
  - `keep_alive.js`: Replaced `var` with `const` for coding style consistency (from commit `style(keep-alive): use const instead of var`).

## [3.0.0] - 2025-11-10

### Added
- **Base Commands**: Added basic public and administrative slash commands.
- **Reaction Role Integration**: Implemented reactions to assign roles to users.
- **Command Loader**: Recursive loader for automatic commands registration.

## [1.0.0] - 2025-03-10

### Added
- **Initial Setup**: Initial project import and repository setup.
