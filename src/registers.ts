import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { REST, Routes } from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function deployCommands(
    clientId: string,
    token: string,
    guildId?: string, // Optionnel : si fourni, déploiement instantané sur ce serveur
) {
    const commandsData = [];
    const commandsPath = path.join(__dirname, "commands");

    if (!fs.existsSync(commandsPath)) {
        console.error("Le dossier 'commands' n'existe pas !");
        return;
    }

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const commandModule = await import(pathToFileURL(filePath).href);
        const command = commandModule.default || commandModule;

        if ("data" in command && "execute" in command) {
            commandsData.push(command.data.toJSON());
        } else {
            console.warn(
                `[AVERTISSEMENT] La commande dans ${filePath} manque de la propriété "data" ou "execute".`,
            );
        }
    }

    const rest = new REST().setToken(token);

    try {
        // Utilisation de la variable d'environnement GUILD_ID si elle existe
        const targetGuildId = guildId || process.env.GUILD_ID;

        if (targetGuildId) {
            console.log(
                `Actualisation instantanée de ${commandsData.length} commande(s) sur la guilde ${targetGuildId}...`,
            );

            // Déploiement sur un serveur spécifique = INSTANTANÉ
            await rest.put(
                Routes.applicationGuildCommands(clientId, targetGuildId),
                { body: commandsData },
            );

            console.log("Commandes de guilde déployées avec succès !");
        } else {
            console.log(
                `Actualisation de ${commandsData.length} commande(s) globalement (peut prendre du temps)...`,
            );

            // Déploiement global
            await rest.put(Routes.applicationCommands(clientId), {
                body: commandsData,
            });

            console.log("Commandes globales déployées avec succès !");
        }
    } catch (error) {
        console.error("Erreur lors du déploiement des commandes :", error);
    }
}