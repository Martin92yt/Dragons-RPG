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

    // Seuls les titres possédés sont listés : pas de catalogue complet (les titres à gagner restent une surprise).
    const lines = player.titles.list().map((title) => {
        const name = contentName(locale, "title", title.id, title.name);
        const description = contentDescription(locale, "title", title.id, title.description);
        const equipped = title.id === equippedId;
        const head = `${emoji(equipped ? "tick" : "title")} **${name}**`;
        return `${head}  •  ${rarityLabel(locale, title.rarity)}${description ? `\n-# ${description}` : ""}`;
    });

    await sendPaged(interaction, locale, {
        title: withEmoji("title", t(locale, "titles.ownedTitle")),
        intro: t(locale, "titles.count", { owned: player.titles.list().length, total: world.titles.list().length }),
        lines,
        perPage: 8,
        emptyText: t(locale, "titles.none"),
        ephemeral: true,
    });
}
