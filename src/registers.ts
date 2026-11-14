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
            console.log(`Déploiement de ${publicBody.length} commande(s) sur la guilde ${devGuild}...`);
            await rest.put(Routes.applicationGuildCommands(clientId, devGuild), {
                body: ownerGuild === devGuild ? [...publicBody, ...ownerBody] : publicBody,
            });
        } else {
            console.log(`Déploiement global de ${publicBody.length} commande(s) (peut prendre du temps)...`);
            await rest.put(Routes.applicationCommands(clientId), { body: publicBody });
        }

        if (ownerGuild && ownerGuild !== devGuild) {
            console.log(`Déploiement de ${ownerBody.length} commande(s) propriétaire sur la guilde ${ownerGuild}...`);
            await rest.put(Routes.applicationGuildCommands(clientId, ownerGuild), { body: ownerBody });
        } else if (!ownerGuild) {
            console.warn("[owner] OwnerGuildID absent : la commande /owner n'est pas déployée.");
        }
        console.log("Commandes déployées avec succès.");
    } catch (error) {
        console.error("Erreur lors du déploiement des commandes :", error);
    }
}
