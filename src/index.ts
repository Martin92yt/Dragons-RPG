import "./types/discord.d";
import { config } from "dotenv";
import { Client, Collection, Events } from "discord.js";
import World from "dragons-of-legends.js";
import CONFIG from "./config";
import { deployCommands } from "./registers";
import { readCommands } from "./core/commands";
import { runGuard } from "./core/middleware";
import { describeError } from "./core/errors";
import { registerEventHooks, rememberPresence } from "./core/events";
import { playerIdOf } from "./core/guard";
import { handleMessageXp } from "./core/xp";
import { withEmoji } from "./core/emojis";
import { panel, reply } from "./core/ui";
import { resolveLocale, t } from "./i18n";

config();

const CLIENT_ID = process.env.ClientID;
const TOKEN = process.env.Discord;

if (!CLIENT_ID || !TOKEN) {
    console.error("Erreur : les variables d'environnement ClientID et Discord sont requises dans le fichier .env");
    process.exit(1);
}

const client = new Client({ intents: 53608447 });
client.commands = new Collection();
client.RPG = new World(CONFIG);

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Connecté en tant que ${readyClient.user.tag}`);

    // Les commandes sont chargées en mémoire AVANT d'être déployées : plus de fenêtre où une interaction arrive sans handler.
    for (const command of await readCommands()) {
        client.commands.set(command.data.name, command);
    }
    registerEventHooks(client);
    await deployCommands(CLIENT_ID, TOKEN, process.env.GuildID);
});

// La librairie ne sauvegarde pas chaque modification : sauvegarde périodique et à l'arrêt.
const autosave = setInterval(() => {
    client.RPG.players.saveAll().catch((error: unknown) => console.error("[autosave]", error));
}, 60_000);
autosave.unref();

async function shutdown(signal: string): Promise<void> {
    console.log(`${signal} reçu, sauvegarde des joueurs...`);
    clearInterval(autosave);
    try {
        await client.RPG.quick();
    } catch (error) {
        console.error("[shutdown]", error);
    }
    await client.destroy();
    process.exit(0);
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

client.on(Events.MessageCreate, (message) => {
    handleMessageXp(message).catch((error) => console.error("[xp]", error));
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`Aucune commande correspondant à ${interaction.commandName}.`);
            return;
        }

        try {
            // Guard exécuté avant chaque commande, sauf exemption explicite (/about, /info).
            if (!command.bypassGuard && !(await runGuard(interaction, command))) return;
            if (interaction.inGuild() && interaction.channelId) {
                rememberPresence(
                    playerIdOf(interaction.guildId, interaction.user.id),
                    interaction.channelId,
                    resolveLocale(interaction.locale),
                );
            }
            await command.execute(interaction);
        } catch (error) {
            const locale = resolveLocale(interaction.locale);
            // Erreur connue de la librairie : message traduit. Sinon bug : log + message générique.
            const known = describeError(locale, error);
            if (!known) console.error(error);
            const message = reply(panel(withEmoji("error", known ?? t(locale, "error.generic"))), { ephemeral: true });

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(message).catch(() => undefined);
            } else {
                await interaction.reply(message).catch(() => undefined);
            }
        }
    } else if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        try {
            await command?.autocomplete?.(interaction);
        } catch (error) {
            console.error("Erreur lors de l'autocomplétion :", error);
        }
    }
});

process.on("unhandledRejection", (reason) => console.error("[unhandledRejection]", reason));

client.login(TOKEN);
