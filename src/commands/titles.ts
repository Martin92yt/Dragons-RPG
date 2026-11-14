import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { suggest } from "../core/autocomplete";
import { withEmoji, emoji } from "../core/emojis";
import { rarityLabel } from "../core/format";
import { loadPlayer, persist, requirePlayer } from "../core/player";
import { sendPaged } from "../core/paginate";
import { panel, reply } from "../core/ui";
import { contentDescription, contentName } from "../i18n/content";
import { describe, named, resolveLocale, t } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "titles", "titres"), "titles.desc")
    .addSubcommand((sub) => describe(named(sub, "owned", "possédés"), "titles.owned.desc"))
    .addSubcommand((sub) => describe(named(sub, "catalog", "catalogue"), "titles.catalog.desc"))
    .addSubcommand((sub) =>
        describe(named(sub, "equip", "équiper"), "titles.equip.desc").addStringOption((o) =>
            describe(named(o, "title", "titre"), "opt.title").setRequired(true).setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) => describe(named(sub, "unequip", "retirer"), "titles.unequip.desc"));

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const player = await loadPlayer(interaction.client, interaction.user.id);
    if (!player) return suggest(interaction, []);
    await suggest(
        interaction,
        player.titles.list().map((title) => ({ name: contentName(locale, "title", title.id, title.name), value: title.id })),
    );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    const sub = interaction.options.getSubcommand();
    const equippedId = player.titles.getEquippedId();

    if (sub === "equip") {
        const title = await player.titles.equip(interaction.options.getString("title", true));
        await persist(interaction.client, player);
        await interaction.reply(
            reply(
                panel(withEmoji("title", t(locale, "titles.equipped", { title: contentName(locale, "title", title.id, title.name) }))),
            ),
        );
        return;
    }

    if (sub === "unequip") {
        const ok = await player.titles.unequip();
        if (ok) await persist(interaction.client, player);
        await interaction.reply(
            reply(
                panel(withEmoji(ok ? "title" : "error", t(locale, ok ? "titles.unequipped" : "titles.unequipFailed"))),
                { ephemeral: !ok },
            ),
        );
        return;
    }

    const catalog = sub === "catalog";
    const all = world.titles.list();
    const source = catalog ? all : player.titles.list();

    const lines = source.map((title) => {
        const owned = player.titles.has(title.id);
        const name = contentName(locale, "title", title.id, title.name);
        const description = contentDescription(locale, "title", title.id, title.description);
        const marks = [
            rarityLabel(locale, title.rarity),
            title.id === equippedId ? t(locale, "titles.equippedMark") : null,
            catalog && !owned ? t(locale, "titles.locked") : null,
        ].filter(Boolean);
        const head = catalog && owned ? `${emoji("tick")} **${name}**` : `**${name}**`;
        return `${head} • ${marks.join(" • ")}${description ? `\n  *${description}*` : ""}`;
    });

    await sendPaged(interaction, locale, {
        title: withEmoji("title", t(locale, catalog ? "titles.catalogTitle" : "titles.ownedTitle")),
        intro: t(locale, "titles.count", { owned: player.titles.list().length, total: all.length }),
        lines,
        perPage: 6,
        emptyText: t(locale, "titles.none"),
        ephemeral: true,
    });
}
