import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { attachGuideMenu, guideView } from "../core/guide";
import { reply } from "../core/ui";
import { describe, named, resolveLocale } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "guide"), "guide.desc");

/** Lecture seule, sans lien avec l'état du personnage : toujours accessible. */
export const bypassGuard = true;

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const response = await interaction.reply({
        ...reply(guideView(locale, "basics"), { ephemeral: true }),
        withResponse: true,
    });
    attachGuideMenu(response.resource!.message!, interaction.user.id, locale);
}
