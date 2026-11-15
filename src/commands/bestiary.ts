import { ContainerBuilder, SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { suggest } from "../core/autocomplete";
import { withEmoji } from "../core/emojis";
import { fullDate, num, tierLabel } from "../core/format";
import { loadPlayer, requirePlayer } from "../core/player";
import { sendPaged } from "../core/paginate";
import { imageGallery, panel, reply } from "../core/ui";
import { BESTIARY_CARD_NAME, renderBestiaryCard } from "../canvas/bestiary-card";
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
        // Fiche dessinée en canvas (voir canvas/bestiary-card.ts) ; le texte alternatif reprend l'essentiel.
        const card = await renderBestiaryCard({
            type: entry.type,
            name,
            tier: enemy ? tierLabel(locale, enemy.tier) : "",
            tierId: enemy?.tier,
            description: contentDescription(locale, "enemy", entry.type, entry.description) ?? "",
            stats: enemy
                ? [
                      { label: t(locale, "bestiary.statHealth"), value: num(locale, enemy.health), icon: "health" as const },
                      { label: t(locale, "bestiary.statStrength"), value: String(enemy.strength), icon: "strength" as const },
                      { label: t(locale, "bestiary.statDefense"), value: String(enemy.defense), icon: "defense" as const },
                  ]
                : [],
            rewards: enemy
                ? [
                      { value: `${num(locale, enemy.experience)} XP`, icon: "experience" as const },
                      { value: num(locale, enemy.gold), icon: "gold" as const },
                  ]
                : [],
            kills: t(locale, "bestiary.kills", { kills: num(locale, entry.kills) }),
            firstDefeat: fullDate(entry.firstDefeatedAt),
            progress: { ratio: bestiary.total > 0 ? bestiary.discovered / bestiary.total : 0, label: `${bestiary.discovered}/${bestiary.total}` },
        });
        const container = new ContainerBuilder().addMediaGalleryComponents(imageGallery(BESTIARY_CARD_NAME, name));
        await interaction.reply(reply(container, { files: [card] }));
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
