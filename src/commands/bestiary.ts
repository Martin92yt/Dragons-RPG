import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { suggest } from "../core/autocomplete";
import { emoji, withEmoji, type EmojiKey } from "../core/emojis";
import { fullDate, goldText, num, tierLabel } from "../core/format";
import { loadPlayer, requirePlayer } from "../core/player";
import { sendPaged } from "../core/paginate";
import { emojiBar, panel, reply } from "../core/ui";
import { contentDescription, contentName } from "../i18n/content";
import { describe, named, resolveLocale, t } from "../i18n";

/** Icône d'un ennemi selon son palier. */
const TIER_ICONS: Record<string, EmojiKey> = { beginner: "animal", intermediate: "demon02", advanced: "demon", boss: "boss" };
const tierIcon = (tier: string | undefined): EmojiKey => TIER_ICONS[tier ?? ""] ?? "enemy";

export const data = describe(named(new SlashCommandBuilder(), "bestiary", "bestiaire"), "bestiary.desc")
    .addSubcommand((sub) => describe(named(sub, "list", "liste"), "bestiary.list.desc"))
    .addSubcommand((sub) =>
        describe(named(sub, "entry", "fiche"), "bestiary.entry.desc").addStringOption((o) =>
            describe(named(o, "enemy", "ennemi"), "opt.enemy").setRequired(true).setAutocomplete(true),
        ),
    );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const player = await loadPlayer(interaction.client, interaction.user.id);
    if (!player) return suggest(interaction, []);
    await suggest(
        interaction,
        player.bestiary
            .list()
            .filter((entry) => entry.discovered)
            .map((entry) => ({ name: contentName(locale, "enemy", entry.type, entry.name), value: entry.type })),
    );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    if (interaction.options.getSubcommand() === "entry") {
        const entry = player.bestiary.getEntry(interaction.options.getString("enemy", true));
        if (!entry.discovered) {
            await interaction.reply(
                reply(panel(withEmoji("error", t(locale, "bestiary.notDiscovered"))), { ephemeral: true }),
            );
            return;
        }

        const enemy = world.enemies.has(entry.type) ? world.enemies.get(entry.type) : undefined;
        const bestiary = player.bestiary.getProgress();
        const name = contentName(locale, "enemy", entry.type, entry.name);
        const progressLine = `${emojiBar(bestiary.discovered, bestiary.total, 10)} ${bestiary.discovered}/${bestiary.total}`;
        const sheet = [
            `## ${emoji(tierIcon(enemy?.tier))} __${name}__${enemy ? `  •  *${tierLabel(locale, enemy.tier)}*` : ""}`,
            contentDescription(locale, "enemy", entry.type, entry.description),
            enemy
                ? [
                      `${emoji("health")} **${num(locale, enemy.health)}**`,
                      `${emoji("strength")} **${enemy.strength}**`,
                      `${emoji("defense")} **${enemy.defense}**`,
                  ].join("  •  ")
                : null,
            enemy ? `${emoji("experience")} **${num(locale, enemy.experience)}** XP  •  ${goldText(locale, enemy.gold)}` : null,
            `${emoji("victory")} ${t(locale, "bestiary.kills", { kills: num(locale, entry.kills) })}  •  ${emoji("clock")} ${fullDate(entry.firstDefeatedAt)}`,
            `${emoji("bestiary")} ${progressLine}`,
        ]
            .filter(Boolean)
            .join("\n");
        await interaction.reply(reply(panel(sheet)));
        return;
    }

    const progress = player.bestiary.getProgress();
    const lines = player.bestiary.list().map((entry) => {
        if (!entry.discovered) return `${emoji("lock")} *${t(locale, "bestiary.unknown")}*`;
        const enemy = world.enemies.has(entry.type) ? world.enemies.get(entry.type) : undefined;
        const name = contentName(locale, "enemy", entry.type, entry.name);
        const tier = enemy ? `  •  ${tierLabel(locale, enemy.tier)}` : "";
        return `${emoji(tierIcon(enemy?.tier))} **${name}**${tier}  •  ${emoji("victory")} ${num(locale, entry.kills)}`;
    });

    await sendPaged(interaction, locale, {
        title: withEmoji("bestiary", t(locale, "bestiary.title")),
        intro: `${emojiBar(progress.discovered, progress.total, 10)}  ${t(locale, "bestiary.progress", {
            discovered: progress.discovered,
            total: progress.total,
            percent: Math.round(progress.percent),
        })}`,
        lines,
        perPage: 14,
        ephemeral: true,
    });
}
