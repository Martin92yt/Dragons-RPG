import type { Client } from "discord.js";
import { log } from "./logger";

/** Identifiants des commandes déployées : `nom` -> id. Rempli après le déploiement, voir `loadCommandIds`. */
const ids = new Map<string, string>();

/**
 * Récupère les identifiants réels des commandes auprès de Discord, pour pouvoir écrire des mentions cliquables
 * `</travel go:ID>`. À appeler après `deployCommands`. Les commandes `ownerOnly` vivent sur un autre serveur : ignorées.
 */
export async function loadCommandIds(client: Client): Promise<void> {
    const guildId = process.env.GuildID || process.env.GUILD_ID;
    const manager = client.application?.commands;
    const commands = guildId ? await manager?.fetch({ guildId }) : await manager?.fetch();
    ids.clear();
    commands?.forEach((command) => ids.set(command.name, command.id));
    log.deploy.info(`${ids.size} identifiant(s) de commande chargé(s) pour les mentions.`);
}

/** Mention cliquable (`</nom sous-commande:ID>`), ou `/nom sous-commande` tant que les identifiants sont inconnus. */
export function commandMention(path: string): string {
    const root = path.split(" ")[0] ?? path;
    const id = ids.get(root);
    return id ? `</${path}:${id}>` : `/${path}`;
}
