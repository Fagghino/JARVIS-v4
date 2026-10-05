/**
 * Script per rimuovere i comandi slash di livello Guild (duplicati)
 * lasciando attivi unicamente i comandi Globali del bot.
 */

require('dotenv').config({ path: './config/.env' });
const { REST, Routes } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.argv[2];

if (!guildId) {
  console.error('❌ Uso: node scripts/clearGuildCommands.js <guildId>');
  process.exit(1);
}

if (!token || !clientId) {
  console.error('❌ DISCORD_TOKEN o DISCORD_CLIENT_ID mancanti nel file config/.env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

async function clearGuildCommands() {
  try {
    console.log(`🧹 Rimozione comandi duplicati di livello Guild per il server [${guildId}]...`);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
    console.log(`✅ Comandi di livello Guild per [${guildId}] svuotati con successo! Ora rimangono solo i comandi Globali.`);
  } catch (error) {
    console.error('❌ Errore durante lo svuotamento dei comandi guild:', error.message);
  }
}

clearGuildCommands();
