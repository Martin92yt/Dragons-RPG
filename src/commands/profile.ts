import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { requireTargetPlayer } from "../core/player";
import { describe, named, resolveLocale } from "../i18n";
import { profileView } from "../views/profile";

export const data = describe(named(new SlashCommandBuilder(), "profile", "profil"), "profile.desc").addUserOption(
    (o) => describe(named(o, "user", "joueur"), "opt.user"),
);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const target = interaction.options.getUser("user") ?? interaction.user;
    const player = await requireTargetPlayer(interaction, target.id);
    if (!player) return;

    await interaction.reply({
        components: [await profileView(locale, interaction.client.RPG, player, target)],
        flags: [MessageFlags.IsComponentsV2],
        allowedMentions: { parse: [] },
    });
}
