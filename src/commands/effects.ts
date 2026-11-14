import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { EffectModifiers } from "dragons-of-legends.js";
import { withEmoji } from "../core/emojis";
import { sendPaged } from "../core/paginate";
import { requirePlayer } from "../core/player";
import { contentDescription, contentName } from "../i18n/content";
import { describe, formatDuration, named, resolveLocale, t, type Locale } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "effects", "effets"), "effects.desc")
    .addSubcommand((sub) => describe(named(sub, "active", "actifs"), "effects.active.desc"))
    .addSubcommand((sub) => describe(named(sub, "catalog", "catalogue"), "effects.catalog.desc"));

function modifierText(locale: Locale, modifiers: EffectModifiers | undefined): string[] {
    if (!modifiers) return [];
    return [
        modifiers.xpMultiplier !== undefined ? t(locale, "effects.mod.xp", { value: modifiers.xpMultiplier }) : null,
        modifiers.luckPercent !== undefined ? t(locale, "effects.mod.luck", { value: modifiers.luckPercent }) : null,
        modifiers.critRateBonus !== undefined ? t(locale, "effects.mod.crit", { value: modifiers.critRateBonus }) : null,
    ].filter((line): line is string => line !== null);
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    if (interaction.options.getSubcommand() === "catalog") {
        const lines = world.effects.list().map((effect) => {
            const parts = [
                t(locale, "effects.duration", { duration: formatDuration(effect.durationMs) }),
                ...modifierText(locale, effect.modifiers),
                effect.tick?.heal
                    ? t(locale, "effects.tick", { heal: effect.tick.heal, interval: formatDuration(effect.tick.intervalMs) })
                    : null,
            ].filter(Boolean);
            const description = contentDescription(locale, "effect", effect.id, effect.description);
            return `**${contentName(locale, "effect", effect.id, effect.name)}** — ${parts.join(" • ")}${description ? `\n  *${description}*` : ""}`;
        });
        await sendPaged(interaction, locale, {
            title: withEmoji("effect", t(locale, "effects.catalogTitle")),
            lines,
            perPage: 6,
            ephemeral: true,
        });
        return;
    }

    const lines = player.effects.list().map((active) => {
        const definition = world.effects.has(active.effectId) ? world.effects.get(active.effectId) : undefined;
        const mods = modifierText(locale, definition?.modifiers);
        return `**${contentName(locale, "effect", active.effectId, active.name)}** — ${t(locale, "effects.remaining", { time: formatDuration(active.remainingMs) })}${mods.length > 0 ? ` • ${mods.join(" • ")}` : ""}`;
    });

    await sendPaged(interaction, locale, {
        title: withEmoji("effect", t(locale, "effects.title")),
        lines,
        emptyText: t(locale, "effects.none"),
        ephemeral: true,
    });
}
