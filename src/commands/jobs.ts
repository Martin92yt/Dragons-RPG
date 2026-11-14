import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { PlayerClass } from "dragons-of-legends.js";
import { BOT } from "../bot.config";
import { withEmoji } from "../core/emojis";
import { playerIdOf } from "../core/guard";
import { runJobSession } from "../core/job-sessions";
import { panel, reply } from "../core/ui";
import { formatDuration, localizations, resolveLocale, t } from "../i18n";

export const data = new SlashCommandBuilder()
    .setName("jobs")
    .setDescription("Jobs")
    .setDescriptionLocalizations({ fr: "Système de métiers", "en-US": "Jobs system" })
    .addSubcommand((sub) =>
        sub
            .setName("fish")
            .setDescription("Go fishing")
            .setDescriptionLocalizations({ fr: "Partir à la pêche", "en-US": "Go fishing" }),
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const user = interaction.user;
    const playerId = playerIdOf(interaction.guildId!, user.id);

    const player = await interaction.client.RPG.players.ensure({
        id: playerId,
        name: user.displayName,
        playerClass: PlayerClass.Explorer,
    });

    if (!player) throw new Error(`Impossible de charger ou créer le joueur ${playerId}.`);

    // On répond tout de suite : la session dure au minimum `BOT.jobs.minDurationMs`.
    await interaction.reply(
        reply(
            panel(
                withEmoji(
                    "fishing",
                    t(locale, "jobs.started", { duration: formatDuration(BOT.jobs.minDurationMs) }),
                ),
            ),
        ),
    );

    const result = await runJobSession(playerId, "fishing", () => player.jobs.perform("fishing", "fish"));

    if (result === null) {
        await interaction.editReply(
            reply(panel(withEmoji("jobs", t(locale, "jobs.alreadyBusy")))) as never,
        );
        return;
    }

    const loot =
        result.loot.length > 0
            ? result.loot.map(({ item, quantity }) => `• **${quantity}x** ${item.name}`).join("\n")
            : t(locale, "jobs.nothing");

    await interaction.editReply(
        reply(
            panel(
                `## ${withEmoji("fishing", t(locale, "jobs.finished"))}`,
                `**${t(locale, "jobs.loot")}**\n${loot}`,
            ),
        ) as never,
    );
}
