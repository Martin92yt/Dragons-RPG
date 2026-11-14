import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { BOT } from "../bot.config";
import { withEmoji } from "../core/emojis";
import { panel, reply } from "../core/ui";
import { localizations, resolveLocale, t } from "../i18n";

export const bypassGuard = true;

export const data = new SlashCommandBuilder()
    .setName("about")
    .setDescription(t("en-US", "about.command.description"))
    .setDescriptionLocalizations(localizations("about.command.description"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);

    const links = [
        `${withEmoji("share", `[${t(locale, "about.link.bot")}](${BOT.links.bot})`)}`,
        `${withEmoji("share", `[${t(locale, "about.link.library")}](${BOT.links.library})`)}`,
    ].join("\n");

    await interaction.reply(
        reply(
            panel(
                `## ${withEmoji("broadsword", t(locale, "about.title"))}`,
                t(locale, "about.universe"),
                t(locale, "about.engine"),
                `**${t(locale, "about.links")}**\n${links}`,
                `-# ${t(locale, "about.author", { author: "Martin92yt" })}`,
            ),
        ),
    );
}
