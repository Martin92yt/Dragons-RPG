import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import type { AchievementDefinition, AchievementReward } from "dragons-of-legends.js";
import { playerIdOf } from "../core/guard";
import { suggest } from "../core/autocomplete";
import { emoji, withEmoji } from "../core/emojis";
import { fullDate, itemName, num } from "../core/format";
import { persist, requirePlayer } from "../core/player";
import { sendPaged } from "../core/paginate";
import { emojiBar, panel, reply } from "../core/ui";
import { contentDescription, contentName } from "../i18n/content";
import { choice, describe, named, resolveLocale, t, type Locale } from "../i18n";

const FILTERS = ["all", "unlocked", "locked"] as const;

export const data = describe(named(new SlashCommandBuilder(), "achievements", "succès"), "achievements.desc")
    .addSubcommand((sub) =>
        describe(named(sub, "list", "liste"), "achievements.list.desc").addStringOption((o) =>
            describe(named(o, "filter", "filtre"), "achievements.filter").addChoices(
                ...FILTERS.map((f) => choice(`achievements.filter.${f}`, f)),
            ),
        ),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "progress", "progression"), "achievements.progress.desc").addStringOption((o) =>
            describe(named(o, "achievement", "succès"), "opt.achievement").setRequired(true).setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) => describe(named(sub, "claim", "réclamer"), "achievements.claim.desc"));

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const playerId = playerIdOf(interaction.user.id);
    await suggest(
        interaction,
        world.achievements
            .list()
            // Un succès caché n'apparaît dans les suggestions qu'une fois débloqué.
            .filter((a) => !a.hidden || world.achievements.isUnlocked(playerId, a.id))
            .map((a) => ({ name: contentName(locale, "achievement", a.id, a.name), value: a.id })),
    );
}

function describeReward(locale: Locale, reward: AchievementReward, world: ChatInputCommandInteraction["client"]["RPG"]): string {
    switch (reward.kind) {
        case "gold":
            return t(locale, "achievements.reward.gold", { amount: num(locale, reward.amount) });
        case "experience":
            return t(locale, "achievements.reward.experience", { amount: num(locale, reward.amount) });
        case "item": {
            const item = world.items.get(reward.itemId);
            return t(locale, "achievements.reward.item", {
                quantity: reward.quantity,
                item: item ? itemName(locale, item) : reward.itemId,
            });
        }
        case "title": {
            const title = world.titles.get(reward.titleId);
            return t(locale, "achievements.reward.title", {
                title: title ? contentName(locale, "title", title.id, title.name) : reward.titleId,
            });
        }
    }
}

function title(locale: Locale, a: AchievementDefinition): string {
    return contentName(locale, "achievement", a.id, a.name);
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    const sub = interaction.options.getSubcommand();
    const manager = world.achievements;

    if (sub === "claim") {
        const claimed = await manager.claimPendingRewards(player.id);
        if (claimed > 0) await persist(interaction.client, player);
        await interaction.reply(
            reply(
                panel(
                    withEmoji(
                        claimed > 0 ? "achievement" : "info",
                        t(locale, claimed > 0 ? "achievements.claimed" : "achievements.nothingToClaim", { count: claimed }),
                    ),
                ),
                { ephemeral: claimed === 0 },
            ),
        );
        return;
    }

    if (sub === "progress") {
        const id = interaction.options.getString("achievement", true);
        if (!manager.has(id)) throw Object.assign(new Error(id), { name: "UnknownAchievementError" });
        const achievement = manager.get(id);
        const view = manager.getProgress(player.id, id);

        if (achievement.hidden && !view.unlocked) {
            await interaction.reply(
                reply(panel(`## ${t(locale, "achievements.hidden")}`, t(locale, "achievements.hiddenText")), {
                    ephemeral: true,
                }),
            );
            return;
        }

        const rewards = (achievement.rewards ?? []).map((r) => `• ${describeReward(locale, r, world)}`);
        const criteria = view.criteria.map(
            (c) => `• ${c.id.replace(/_/g, " ")} : **${num(locale, Math.min(c.current, c.target))}/${num(locale, c.target)}**`,
        );

        await interaction.reply(
            reply(
                panel(
                    `## ${withEmoji("achievement", title(locale, achievement))}`,
                    contentDescription(locale, "achievement", achievement.id, achievement.description),
                    `${emojiBar(view.percent, 100, 8)} ${t(locale, "achievements.percent", { percent: Math.round(view.percent) })}${
                        view.unlockedAt ? ` • ${t(locale, "achievements.unlockedOn", { date: fullDate(view.unlockedAt) })}` : ""
                    }`,
                    criteria.length > 0 ? `**${t(locale, "achievements.criteria")}**\n${criteria.join("\n")}` : null,
                    rewards.length > 0 ? `**${t(locale, "achievements.rewards")}**\n${rewards.join("\n")}` : null,
                ),
                { ephemeral: true },
            ),
        );
        return;
    }

    // list
    const filter = (interaction.options.getString("filter") ?? "all") as (typeof FILTERS)[number];
    const all = manager.list();
    const unlockedCount = all.filter((a) => manager.isUnlocked(player.id, a.id)).length;

    const entries = all
        .map((a) => ({ a, view: manager.getProgress(player.id, a.id) }))
        .filter(({ view }) => filter === "all" || (filter === "unlocked" ? view.unlocked : !view.unlocked));

    // Regroupement par catégorie, dans l'ordre d'apparition.
    const groups = new Map<string, string[]>();
    for (const { a, view } of entries) {
        const category = contentName(locale, "achievementCategory", a.category ?? "other", a.category ?? "—");
        const hiddenLocked = a.hidden && !view.unlocked;
        const line = hiddenLocked
            ? `${t(locale, "achievements.hidden")} — *${t(locale, "achievements.hiddenText")}*`
            : `${view.unlocked ? `${emoji("tick")} ` : ""}**${title(locale, a)}** — ${view.unlocked ? t(locale, "achievements.unlockedOn", { date: fullDate(view.unlockedAt ?? 0) }) : `${emojiBar(view.percent, 100, 8)} ${t(locale, "achievements.percent", { percent: Math.round(view.percent) })}`}`;
        const bucket = groups.get(category) ?? [];
        bucket.push(`• ${line}`);
        groups.set(category, bucket);
    }
    const lines = [...groups.entries()].flatMap(([category, bucket]) => [`**${category}**`, ...bucket]);

    await sendPaged(interaction, locale, {
        title: withEmoji("achievement", t(locale, "achievements.title")),
        intro: t(locale, "achievements.count", { unlocked: unlockedCount, total: all.length }),
        lines,
        perPage: 12,
        ephemeral: true,
    });
}

