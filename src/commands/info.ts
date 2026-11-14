import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { createRequire } from "node:module";
import { BOT } from "../bot.config";
import { withEmoji } from "../core/emojis";
import { panel, reply } from "../core/ui";
import { localizations, resolveLocale, t } from "../i18n";

export const bypassGuard = true;

const require = createRequire(import.meta.url);

function libraryVersion(): string {
    try {
        return (require("dragons-of-legends.js/package.json") as { version: string }).version;
    } catch {
        return "?";
    }
}

export const data = new SlashCommandBuilder()
    .setName("info")
    .setDescription(t("en-US", "info.command.description"))
    .setDescriptionLocalizations(localizations("info.command.description"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const client = interaction.client;

    const ping = client.ws.ping;
    // `ping` vaut -1 tant qu'aucun heartbeat n'a été reçu : on le considère comme dégradé.
    const healthy = client.isReady() && ping >= 0 && ping < 500;

    const memoryMb = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    const startedAt = Math.floor((Date.now() - process.uptime() * 1000) / 1000);

    const line = (emojiKey: Parameters<typeof withEmoji>[0], label: string, value: string) =>
        withEmoji(emojiKey, `**${label}** : ${value}`);

    const stats = [
        line("bug", t(locale, "info.version"), `${BOT.version}`),
        line("tag", t(locale, "info.library"), libraryVersion()),
        line(
            "wifi",
            t(locale, "info.health"),
            healthy ? t(locale, "info.health.ok") : t(locale, "info.health.degraded"),
        ),
        line("info", t(locale, "info.ping"), ping >= 0 ? `${ping} ms` : "—"),
        line("clock", t(locale, "info.uptime"), `<t:${startedAt}:R>`),
        line("microchip", t(locale, "info.memory"), `${memoryMb} MB`),
    ].join("\n");

    const world = [
        line("usergroup", t(locale, "info.servers"), String(client.guilds.cache.size)),
        line("user", t(locale, "info.players"), String(client.RPG.players.size)),
        line("branch", t(locale, "info.node"), process.version),
        line("earth", t(locale, "info.locale"), locale === "fr" ? "Français" : "English (US)"),
    ].join("\n");

    await interaction.reply(
        reply(panel(`## ${withEmoji("info", t(locale, "info.title"))}`, stats, world)),
    );
}
