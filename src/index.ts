import { log } from "./core/logger";
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
import { loadCommandIds } from "./core/mentions";
import { handleMessageXp } from "./core/xp";
import { sendWelcome, WELCOME_START_ID } from "./core/welcome";
import { showStart } from "./commands/start";
import { withEmoji } from "./core/emojis";
import { panel, reply } from "./core/ui";
import { resolveLocale, t } from "./i18n";

config();

const CLIENT_ID = process.env.ClientID;
const TOKEN = process.env.Discord;

if (!CLIENT_ID || !TOKEN) {
    log.bot.fatal("Les variables d'environnement ClientID et Discord sont requises dans le fichier .env");
    process.exit(1);
}

const client = new Client({ intents: 53608447 });
client.commands = new Collection();
client.RPG = new World(CONFIG);

client.once(Events.ClientReady, async (readyClient) => {
    log.bot.success(`Connecté en tant que ${readyClient.user.tag}`);

    // Les commandes sont chargées en mémoire AVANT d'être déployées : plus de fenêtre où une interaction arrive sans handler.
    for (const command of await readCommands()) {
        client.commands.set(command.data.name, command);
    }
    registerEventHooks(client);
    readyClient.user.setActivity("/start • Dragons RPG");
    await deployCommands(CLIENT_ID, TOKEN, process.env.GuildID);
    await loadCommandIds(readyClient).catch((error) => log.deploy.error("Mentions de commandes indisponibles", error));
});

// La librairie ne sauvegarde pas chaque modification : sauvegarde périodique et à l'arrêt.
const autosave = setInterval(() => {
    client.RPG.players.saveAll().catch((error: unknown) => log.save.error(error));
}, 60_000);
autosave.unref();

async function shutdown(signal: string): Promise<void> {
    log.bot.info(`${signal} reçu, sauvegarde des joueurs...`);
    clearInterval(autosave);
    try {
        await client.RPG.quick();
    } catch (error) {
        log.bot.error(error);
    }
    await client.destroy();
    process.exit(0);
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

client.on(Events.GuildCreate, (guild) => {
    sendWelcome(guild).catch((error) => log.welcome.error(error));
});

client.on(Events.MessageCreate, (message) => {
    handleMessageXp(message).catch((error) => log.xp.error(error));
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            log.command.warn(`Commande inconnue : ${interaction.commandName}`);
            return;
        }

        try {
            // Guard exécuté avant chaque commande, sauf exemption explicite (/about, /info).
            if (!command.bypassGuard && !(await runGuard(interaction, command))) return;
            if (interaction.channelId) {
                rememberPresence(
                    playerIdOf(interaction.user.id),
                    interaction.channelId,
                    resolveLocale(interaction.locale),
                );
            }
            await command.execute(interaction);
        } catch (error) {
            const locale = resolveLocale(interaction.locale);
            // Erreur connue de la librairie : message traduit. Sinon bug : log + message générique.
            const known = describeError(locale, error);
            if (!known) log.command.error(error);
            const message = reply(panel(withEmoji("error", known ?? t(locale, "error.generic"))), { ephemeral: true });

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(message).catch(() => undefined);
            } else {
                await interaction.reply(message).catch(() => undefined);
            }
        }
    } else if (interaction.isButton() && interaction.customId === WELCOME_START_ID) {
        showStart(interaction).catch((error) => log.bot.error(error));
    } else if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        try {
            await command?.autocomplete?.(interaction);
        } catch (error) {
            log.command.error("Autocomplétion", error);
        }
    }
});

process.on("unhandledRejection", (reason) => log.bot.error(reason));

client.login(TOKEN);
