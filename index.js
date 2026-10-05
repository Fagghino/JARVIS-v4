const { Client, GatewayIntentBits, Collection, Partials } = require("discord.js");
require("dotenv").config({ path: "./config/.env" });

// Valida variabili d'ambiente essenziali come prima cosa (MEDIA-06)
const requiredEnvVars = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'MONGODB_URI', 'SESSION_SECRET'];
const missing = requiredEnvVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Variabili d'ambiente mancanti: ${missing.join(', ')}`);
  console.error('Controlla il file config/.env');
  process.exit(1);
}

const config = require("./config/config.js");
const { connectDB } = require("./misc/database.js");
const counter = require("./misc/counter");
const welcome = require("./misc/welcome");
const { handleXP, handleVoiceXP, flushCache } = require("./misc/level.js");
const { handleReactionAdd, handleReactionRemove } = require("./misc/reactionRoles");
const { getGuildConfig } = require("./utils/guildSettings.js");
const fs = require("fs");
const path = require("path");
const { checkCooldown } = require("./utils/cooldown");

const startDashboard = require("./dashboard/server.js");

// Inizializza il client Discord con gli intent necessari
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
});


// Collection per memorizzare tutti i comandi slash del bot
client.commands = new Collection();

// Carica tutti i comandi ricorsivamente
const { loadCommandsFromDir, printLoadStats } = require('./utils/loadCommands');
const commandsPath = path.resolve('./commands');
const commandStats = { loaded: [], failed: [] };

if (fs.existsSync(commandsPath)) {
  const commands = loadCommandsFromDir(commandsPath, commandStats);
  commands.forEach(cmd => {
    if (cmd.data && cmd.execute) {
      client.commands.set(cmd.data.name, cmd);
    }
  });
  printLoadStats(commandStats, 'Caricamento comandi');
} else {
  console.warn('⚠️ La cartella "commands" non esiste!');
}


// Evento eseguito quando il bot si connette a Discord
client.once("ready", () => {
  console.log(`🤖 JARVIS connesso con successo come ${client.user.tag}`);
  console.log(`🌐 Servendo un totale di ${client.guilds.cache.size} server Discord.`);

  client.user.setPresence({
    activities: [
      {
        name: "PH 🖤🧡 | Multi-Server",
        type: 3,
      },
    ],
    status: "online",
  });

  // Avvia i moduli di background
  counter(client);
  welcome(client);

  // Timer per XP vocale su tutti i server (ogni 30 secondi)
  setInterval(() => {
    handleVoiceXP(client);
  }, 30000);

  // Flush della cache XP (ogni 60 secondi)
  setInterval(() => {
    flushCache();
  }, 60000);
});

// Eventi di ciclo di vita server (Nuovo server aggiunto o rimosso)
client.on("guildCreate", async (guild) => {
  console.log(`🎉 JARVIS è stato aggiunto a un nuovo server: "${guild.name}" [${guild.id}]`);
  await getGuildConfig(guild.id); // Inizializza la configurazione per il nuovo server
});

client.on("guildDelete", (guild) => {
  console.log(`👋 JARVIS è stato rimosso dal server: "${guild.name}" [${guild.id}]`);
});

// Gestione degli slash commands e autocomplete
client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command?.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`Errore autocomplete [${interaction.commandName}]:`, error);
    }
    return;
  }

  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const cooldownMsg = checkCooldown(interaction);
  if (cooldownMsg) {
    return interaction.reply({ content: cooldownMsg, ephemeral: true });
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Errore durante l'esecuzione del comando /${interaction.commandName}:`, error);
    try {
      const errorMessage = "❌ Si è verificato un errore durante l'esecuzione di questo comando.";
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      console.error("⚠️ Impossibile inviare la notifica di errore all'utente:", replyError.message);
    }
  }
});

// Listener messaggi per XP
client.on("messageCreate", (message) => {
  handleXP(client, message);
});

// Listener reazioni per Reaction Roles
client.on("messageReactionAdd", (reaction, user) => {
  handleReactionAdd(reaction, user);
});

client.on("messageReactionRemove", (reaction, user) => {
  handleReactionRemove(reaction, user);
});

// Avvio asincrono: connessione DB, avvio Web Dashboard e login Discord (MEDIA-03)
(async () => {
  try {
    await connectDB();
    startDashboard(client);
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ Errore fatale durante l\'avvio di JARVIS:', error);
    process.exit(1);
  }
})();

// Gestione eccezioni globali (ALTA-01)
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [unhandledRejection] Eccezione non gestita:', reason);
});

process.on('uncaughtException', async (err) => {
  console.error('❌ [uncaughtException] Errore critico in JARVIS:', err);
  try {
    const { flushCache } = require("./misc/level.js");
    await flushCache();
  } catch (flushErr) {
    console.error('Errore durante il flush della cache XP in crash:', flushErr);
  }
  process.exit(1);
});

// Shutdown pulito
process.on('SIGINT', async () => {
  console.log('\n⚠️ [SIGINT] Disconnessione pulita di JARVIS...');
  try {
    await flushCache();
  } catch (err) {
    console.error('Errore durante il flush della cache XP in shutdown:', err);
  }
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ [SIGTERM] Segnale di arresto ricevuto.');
  try {
    await flushCache();
  } catch (err) {
    console.error('Errore durante il flush della cache XP in shutdown:', err);
  }
  client.destroy();
  process.exit(0);
});
