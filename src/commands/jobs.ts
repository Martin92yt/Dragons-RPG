import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import type { JobReward } from "dragons-of-legends.js/dist/jobs/job.types.js";
import { suggest } from "../core/autocomplete";
import { withEmoji } from "../core/emojis";
import { goldText, itemName, num } from "../core/format";
import { runJobSession } from "../core/job-sessions";
import { loadPlayer, persist, requirePlayer } from "../core/player";
import { sendPaged } from "../core/paginate";
import { bar, edit, panel, reply } from "../core/ui";
import { contentName } from "../i18n/content";
import { describe, formatDuration, named, resolveLocale, t, type Locale } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "jobs", "métiers"), "jobs.desc")
    .addSubcommand((sub) => describe(named(sub, "list", "liste"), "jobs.list.desc"))
    .addSubcommand((sub) => describe(named(sub, "progress", "progression"), "jobs.progress.desc"))
    .addSubcommand((sub) =>
        describe(named(sub, "work", "travailler"), "jobs.work.desc")
            .addStringOption((o) => describe(named(o, "job", "métier"), "opt.job").setRequired(true).setAutocomplete(true))
            .addStringOption((o) => describe(named(o, "action"), "opt.action").setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "equip-tool", "équiper-outil"), "jobs.equipTool.desc")
            .addStringOption((o) => describe(named(o, "job", "métier"), "opt.job").setRequired(true).setAutocomplete(true))
            .addStringOption((o) => describe(named(o, "item", "objet"), "opt.item").setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "unequip-tool", "retirer-outil"), "jobs.unequipTool.desc").addStringOption((o) =>
            describe(named(o, "job", "métier"), "opt.job").setRequired(true).setAutocomplete(true),
        ),
    );

const jobName = (locale: Locale, id: string, fallback: string) => contentName(locale, "job", id, fallback);
const actionName = (locale: Locale, id: string, fallback: string) => contentName(locale, "jobAction", id, fallback);

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const focused = interaction.options.getFocused(true).name;

    if (focused === "job") {
        return suggest(interaction, world.jobs.list().map((job) => ({ name: jobName(locale, job.id, job.name), value: job.id })));
    }

    if (focused === "action") {
        const jobId = interaction.options.getString("job");
        const job = jobId && world.jobs.has(jobId) ? world.jobs.get(jobId) : undefined;
        return suggest(interaction, (job?.actions ?? []).map((a) => ({ name: actionName(locale, a.id, a.name), value: a.id })));
    }

    if (focused === "item" && interaction.inGuild()) {
        const player = await loadPlayer(interaction.client, interaction.guildId!, interaction.user.id);
        const records = player ? await player.inventory.getItems() : [];
        return suggest(
            interaction,
            records.filter((r) => r.category === "tool").map((r) => ({ name: itemName(locale, r), value: r.itemId })),
        );
    }

    return suggest(interaction, []);
}

function rewardLine(locale: Locale, reward: JobReward): string {
    return reward.kind === "gold"
        ? `• ${goldText(locale, reward.amount)}`
        : `• **${reward.quantity}x** ${itemName(locale, reward.item)}`;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
        const lines = world.jobs.list().map((job) => {
            const actions = job.actions.map((action) => {
                const extra = [
                    action.requiredLevel && action.requiredLevel > 1
                        ? t(locale, "jobs.requiresLevel", { level: action.requiredLevel })
                        : null,
                    action.requiresTool ? t(locale, "jobs.requiresTool") : null,
                ].filter(Boolean);
                return `  ${t(locale, "jobs.action", {
                    action: actionName(locale, action.id, action.name),
                    cooldown: formatDuration(action.cooldownMs),
                    xp: action.xp,
                    extra: extra.length > 0 ? ` • ${extra.join(", ")}` : "",
                })}`;
            });
            return `${withEmoji("jobs", `**${jobName(locale, job.id, job.name)}**`)}\n${actions.join("\n")}`;
        });
        await sendPaged(interaction, locale, {
            title: t(locale, "jobs.listTitle"),
            lines,
            perPage: 3,
            ephemeral: true,
        });
        return;
    }

    if (sub === "progress") {
        const lines = player.jobs.listProgress().map((view) => {
            const job = world.jobs.has(view.jobId) ? world.jobs.get(view.jobId) : undefined;
            const toolId = view.equippedToolItemId;
            const tool = toolId && world.items.has(toolId) ? itemName(locale, world.items.get(toolId)!) : null;
            const cooldowns = (job?.actions ?? [])
                .map((a) => ({ a, ms: player.jobs.getRemainingCooldownMs(view.jobId, a.id) }))
                .filter(({ ms }) => ms > 0)
                .map(({ a, ms }) => `${actionName(locale, a.id, a.name)}: ${formatDuration(ms)}`);
            return [
                t(locale, "jobs.progressLine", {
                    job: jobName(locale, view.jobId, view.name),
                    level: view.level,
                    max: view.maxLevel,
                    bar: bar(view.percent, 100, 10),
                    percent: Math.round(view.percent),
                }),
                `  ${tool ? t(locale, "jobs.tool", { tool }) : t(locale, "jobs.noTool")}${cooldowns.length > 0 ? ` • ${t(locale, "jobs.cooldownLeft", { time: cooldowns.join(", ") })}` : ""}`,
            ].join("\n");
        });
        await sendPaged(interaction, locale, {
            title: withEmoji("jobs", t(locale, "jobs.progressTitle")),
            lines,
            perPage: 5,
            ephemeral: true,
        });
        return;
    }

    const jobId = interaction.options.getString("job", true);
    const job = world.jobs.require(jobId);
    const jobLabel = jobName(locale, job.id, job.name);

    if (sub === "equip-tool") {
        const itemId = interaction.options.getString("item", true);
        await player.jobs.equipTool(jobId, itemId);
        await persist(interaction.client, player);
        const item = world.items.get(itemId);
        await interaction.reply(
            reply(
                panel(
                    withEmoji("tool", t(locale, "jobs.toolEquipped", { job: jobLabel, item: item ? itemName(locale, item) : itemId })),
                ),
            ),
        );
        return;
    }

    if (sub === "unequip-tool") {
        const removed = await player.jobs.unequipTool(jobId);
        await persist(interaction.client, player);
        await interaction.reply(
            reply(
                panel(
                    withEmoji(
                        removed ? "tool" : "error",
                        t(locale, removed ? "jobs.toolUnequipped" : "jobs.toolUnequipFailed", { job: jobLabel }),
                    ),
                ),
                { ephemeral: !removed },
            ),
        );
        return;
    }

    // work : le joueur est verrouillé pour toute la session (au moins `BOT.jobs.minDurationMs`).
    const actionId = interaction.options.getString("action", true);
    const action = world.jobs.requireAction(jobId, actionId);

    const result = await runJobSession(
        player.id,
        jobId,
        () => player.jobs.perform(jobId, actionId),
        {
            onStart: ({ durationMs }) =>
                interaction.reply(
                    reply(
                        panel(
                            withEmoji(
                                "jobs",
                                t(locale, "jobs.started", {
                                    job: jobLabel,
                                    action: actionName(locale, action.id, action.name),
                                    duration: formatDuration(durationMs),
                                }),
                            ),
                        ),
                    ),
                ).then(() => undefined),
        },
    );

    if (result === null) {
        await interaction.reply(reply(panel(withEmoji("error", t(locale, "jobs.alreadyBusy"))), { ephemeral: true }));
        return;
    }
    await persist(interaction.client, player);

    const loot =
        result.loot.length > 0
            ? result.loot.map(({ item, quantity }) => `• **${quantity}x** ${itemName(locale, item)}`).join("\n")
            : t(locale, "jobs.nothing");

    await interaction.editReply(
        edit(
            panel(
                `## ${withEmoji("jobs", `${t(locale, "jobs.finished")} — ${actionName(locale, action.id, action.name)}`)}`,
                `**${t(locale, "jobs.loot")}**\n${loot}`,
                t(locale, "jobs.xpGained", { xp: num(locale, result.xpGained) }),
                result.level > result.previousLevel ? withEmoji("level", t(locale, "jobs.levelUp", { level: result.level })) : null,
                result.rewards.length > 0
                    ? `**${t(locale, "jobs.levelRewards")}**\n${result.rewards.map((r) => rewardLine(locale, r)).join("\n")}`
                    : null,
            ),
        ) as never,
    );
}
