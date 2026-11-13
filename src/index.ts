import CONFIG from './config';
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config } from "dotenv";
import { Client, Collection, Events, MessageFlags } from "discord.js";
import World from "dragons-of-legends.js";
import { deployCommands } from "./registers.js";

config();

const CLIENT_ID = process.env.ClientID;

if (!CLIENT_ID) {
    console.error(
        "Erreur : La variable d'environnement CLIENT_ID est manquante dans le fichier .env",
    );
    process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ intents: 53608447 });
client.commands = new Collection();
client.RPG = new World(CONFIG);

// Fonction pour charger dynamiquement les commandes en mémoire
async function loadCommands() {
    const commandsPath = path.join(__dirname, "commands");

    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath);
    }

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const commandModule = await import(pathToFileURL(filePath).href);
        const command = commandModule.default || commandModule;

        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(
                `[AVERTISSEMENT] La commande dans ${filePath} manque de la propriété "data" ou "execute".`,
            );
        }
    }
}

// Événement de démarrage du bot
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Connecté en tant que ${readyClient.user.tag} ! Hello world!`);

    // 1. Déploie automatiquement les commandes GLOBALEMENT
    await deployCommands(CLIENT_ID, process.env.Discord!, process.env.GuildID);

    // 2. Charge les commandes en mémoire pour le bot
    await loadCommands();
});

// Gestion des interactions
client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(
                `Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`,
            );
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            const errorMessage = {
                content:
                    "Une erreur est survenue lors de l'exécution de cette commande !",
                flags: MessageFlags.Ephemeral,
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    } 
    else if (interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            if ("autocomplete" in command && typeof command.autocomplete === "function") {
                command.autocomplete(interaction);
            }
        } catch (error) {
            console.error("Erreur lors de l'autocomplétion :", error);
        }
    }
});

// Connexion du bot
client.login(process.env.Discord);