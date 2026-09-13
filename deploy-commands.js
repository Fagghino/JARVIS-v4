/**
 * Script per la registrazione dei comandi slash su Discord (Global Commands)
 *
 * Carica ricorsivamente tutti i comandi dalle cartelle commands/ e
 * li registra a livello globale su Discord API per tutti i server in cui è presente il bot.
 */

const { REST, Routes } = require('discord.js');
require('dotenv').config({ path: './config/.env' });
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const fs = require('fs');
const path = require('path');
const { loadCommandsFromDir, printLoadStats } = require('./utils/loadCommands');

/**
 * Funzione principale per registrare i comandi su Discord
 * @returns {Promise<void>}
 */
async function deployCommands() {
    const deployStats = { loaded: [], invalid: [], failed: [] };

    // Carica tutti i comandi dalla cartella commands/ usando il modulo condiviso
    const commandsPath = path.resolve('./commands');
    let commands = [];

    if (fs.existsSync(commandsPath)) {
        const loadedCommands = loadCommandsFromDir(commandsPath, deployStats);
        commands = loadedCommands
            .filter(cmd => cmd.data && cmd.data.name)
            .map(cmd => cmd.data.toJSON());

        printLoadStats(deployStats, 'Registrazione');
    } else {
        console.warn('⚠️  La cartella "commands" non esiste!');
    }

    if (!token || !clientId) {
        console.error('❌ DISCORD_TOKEN o DISCORD_CLIENT_ID mancanti nel file config/.env');
        return;
    }

    // Inizializza REST API client per comunicare con Discord
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(`🚀 Registrazione di ${commands.length} comandi Globali su Discord API in corso...`);
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log(`✅ ${commands.length} comandi registrati a livello GLOBALE con successo!`);
    } catch (error) {
        console.error('❌ Errore durante la registrazione dei comandi:', error);
    }
}

module.exports = deployCommands;

// Se lo script viene eseguito direttamente (es: node deploy-commands.js)
if (require.main === module) {
    deployCommands().catch(err => console.error('❌ Errore critico nel deploy:', err));
}
