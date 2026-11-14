import { REST, Routes } from "discord.js";
import { readCommands } from "./core/commands";

export async function deployCommands(
    clientId: string,
    token: string,
    guildId?: string, // Optionnel : déploiement instantané sur ce serveur
): Promise<void> {
    const commands = await readCommands();
    const body = commands.map((command) => command.data.toJSON());
    const rest = new REST().setToken(token);

    try {
        const targetGuildId = guildId || process.env.GUILD_ID;

        if (targetGuildId) {
            console.log(`Déploiement de ${body.length} commande(s) sur la guilde ${targetGuildId}...`);
            await rest.put(Routes.applicationGuildCommands(clientId, targetGuildId), { body });
        } else {
            console.log(`Déploiement global de ${body.length} commande(s) (peut prendre du temps)...`);
            await rest.put(Routes.applicationCommands(clientId), { body });
        }
        console.log("Commandes déployées avec succès.");
    } catch (error) {
        console.error("Erreur lors du déploiement des commandes :", error);
    }
}
