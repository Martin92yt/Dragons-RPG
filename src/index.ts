import "./types/discord.d";
import { config } from "dotenv";
import { Client, Collection, Events } from "discord.js";
import World from "dragons-of-legends.js";
import CONFIG from "./config";
import { deployCommands } from "./registers";
import { readCommands } from "./core/commands";
import { runGuard } from "./core/middleware";
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
    await deployCommands(CLIENT_ID, TOKEN, process.env.GuildID);
});

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
            if (!command.bypassGuard && !(await runGuard(interaction))) return;
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            const locale = resolveLocale(interaction.locale);
            const message = reply(panel(withEmoji("error", t(locale, "error.generic"))), { ephemeral: true });

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
