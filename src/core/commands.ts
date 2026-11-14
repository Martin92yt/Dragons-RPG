import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const commandsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "commands");

/**
 * Charge toutes les commandes du dossier `commands/`.
 * Utilisé à la fois par le chargement en mémoire et par le déploiement Discord, pour un seul parcours de référence.
 */
export async function readCommands(): Promise<BotCommand[]> {
    if (!fs.existsSync(commandsDir)) return [];

    const files = fs
        .readdirSync(commandsDir)
        .filter((file) => (file.endsWith(".ts") || file.endsWith(".js")) && !file.endsWith(".d.ts"));

    const commands: BotCommand[] = [];
    for (const file of files) {
        const filePath = path.join(commandsDir, file);
        const mod = await import(pathToFileURL(filePath).href);
        const command = (mod.default ?? mod) as Partial<BotCommand>;

        if (command.data && typeof command.execute === "function") {
            commands.push(command as BotCommand);
        } else {
            console.warn(`[AVERTISSEMENT] ${file} n'exporte pas "data" et "execute".`);
        }
    }
    return commands;
}
