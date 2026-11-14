import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { suggest } from "../core/autocomplete";
import { withEmoji } from "../core/emojis";
import { fullDate, goldText, num, tierLabel } from "../core/format";
import { loadPlayer, requirePlayer } from "../core/player";
import { sendPaged } from "../core/paginate";
import { panel, reply } from "../core/ui";
import { contentDescription, contentName } from "../i18n/content";
import { describe, named, resolveLocale, t } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "bestiary", "bestiaire"), "bestiary.desc")
    .addSubcommand((sub) => describe(named(sub, "list", "liste"), "bestiary.list.desc"))
    .addSubcommand((sub) =>
        describe(named(sub, "entry", "fiche"), "bestiary.entry.desc").addStringOption((o) =>
            describe(named(o, "enemy", "ennemi"), "opt.enemy").setRequired(true).setAutocomplete(true),
        ),
    );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    if (!interaction.inGuild()) return suggest(interaction, []);
    const locale = resolveLocale(interaction.locale);
    const player = await loadPlayer(interaction.client, interaction.guildId!, interaction.user.id);
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
        await interaction.reply(
            reply(
                panel(
                    `## ${withEmoji("bestiary", contentName(locale, "enemy", entry.type, entry.name))}`,
                    contentDescription(locale, "enemy", entry.type, entry.description),
                    enemy ? `**${tierLabel(locale, enemy.tier)}** • ${t(locale, "bestiary.stats", { health: num(locale, enemy.health), strength: enemy.strength, defense: enemy.defense })}` : null,
                    enemy
                        ? t(locale, "bestiary.rewards", { xp: num(locale, enemy.experience), gold: goldText(locale, enemy.gold) })
                        : null,
                    `${t(locale, "bestiary.kills", { kills: num(locale, entry.kills) })} • ${t(locale, "bestiary.firstDefeat", { date: fullDate(entry.firstDefeatedAt) })}`,
                ),
                { ephemeral: true },
            ),
        );
        return;
    }

    const progress = player.bestiary.getProgress();
    const lines = player.bestiary.list().map((entry) =>
        entry.discovered
            ? `**${contentName(locale, "enemy", entry.type, entry.name)}** — ${t(locale, "bestiary.kills", { kills: num(locale, entry.kills) })}`
            : `*${t(locale, "bestiary.unknown")}*`,
    );

    await sendPaged(interaction, locale, {
        title: withEmoji("bestiary", t(locale, "bestiary.title")),
        intro: t(locale, "bestiary.progress", {
            discovered: progress.discovered,
            total: progress.total,
            percent: Math.round(progress.percent),
        }),
        lines,
        perPage: 14,
        ephemeral: true,
    });
}
