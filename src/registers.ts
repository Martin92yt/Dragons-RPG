import { log } from "./core/logger";
import { REST, Routes } from "discord.js";
import { readCommands } from "./core/commands";

/**
 * Déploie les commandes.
 *
 * - Commandes publiques : globalement, ou sur `guildId` (déploiement instantané de développement).
 * - Commandes `ownerOnly` : jamais globalement, uniquement sur le serveur `OwnerGuildID` (ou `guildId`).
 *   Discord ne permet pas de cibler un utilisateur : on les garde hors de portée des autres serveurs.
 */
export async function deployCommands(clientId: string, token: string, guildId?: string): Promise<void> {
    const commands = await readCommands();
    const rest = new REST().setToken(token);

    const devGuild = guildId || process.env.GUILD_ID;
    const ownerGuild = process.env.OwnerGuildID || devGuild;
    const publicBody = commands.filter((c) => !c.ownerOnly).map((c) => c.data.toJSON());
    const ownerBody = commands.filter((c) => c.ownerOnly).map((c) => c.data.toJSON());

    try {
        if (devGuild) {
            log.deploy.info(`Déploiement de ${publicBody.length} commande(s) sur la guilde ${devGuild}...`);
            await rest.put(Routes.applicationGuildCommands(clientId, devGuild), {
                body: ownerGuild === devGuild ? [...publicBody, ...ownerBody] : publicBody,
            });
        } else {
            log.deploy.info(`Déploiement global de ${publicBody.length} commande(s) (peut prendre du temps)...`);
            await rest.put(Routes.applicationCommands(clientId), { body: publicBody });
        }

        if (ownerGuild && ownerGuild !== devGuild) {
            log.deploy.info(`Déploiement de ${ownerBody.length} commande(s) propriétaire sur la guilde ${ownerGuild}...`);
            await rest.put(Routes.applicationGuildCommands(clientId, ownerGuild), { body: ownerBody });
        } else if (!ownerGuild) {
            log.deploy.warn("OwnerGuildID absent : la commande /owner n'est pas déployée.");
        }
        log.deploy.info("Commandes déployées avec succès.");
    } catch (error) {
        log.deploy.error("Erreur lors du déploiement des commandes", error);
    }
}
