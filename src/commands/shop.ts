import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { suggest } from "../core/autocomplete";
import { withEmoji } from "../core/emojis";
import { goldText, itemDescription, itemName } from "../core/format";
import { loadPlayer, persist, requirePlayer } from "../core/player";
import { sendPaged } from "../core/paginate";
import { panel, reply } from "../core/ui";
import { contentName } from "../i18n/content";
import { contentDescription } from "../i18n/content";
import { describe, named, resolveLocale, t } from "../i18n";


export const data = describe(named(new SlashCommandBuilder(), "shop", "boutique"), "shop.desc")
    .addSubcommand((sub) =>
        describe(named(sub, "list", "liste"), "shop.list.desc").addStringOption((o) =>
            describe(named(o, "shop", "boutique"), "opt.shop").setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "buy", "acheter"), "shop.buy.desc")
            .addStringOption((o) =>
                describe(named(o, "item", "objet"), "opt.item").setRequired(true).setAutocomplete(true),
            )
            .addIntegerOption((o) =>
                describe(named(o, "quantity", "quantité"), "opt.quantity").setMinValue(1).setMaxValue(999),
            )
            .addStringOption((o) => describe(named(o, "shop", "boutique"), "opt.shop").setAutocomplete(true)),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "sell", "vendre"), "shop.sell.desc")
            .addStringOption((o) =>
                describe(named(o, "item", "objet"), "opt.item").setRequired(true).setAutocomplete(true),
            )
            .addIntegerOption((o) =>
                describe(named(o, "quantity", "quantité"), "opt.quantity").setMinValue(1).setMaxValue(999),
            )
            .addStringOption((o) => describe(named(o, "shop", "boutique"), "opt.shop").setAutocomplete(true)),
    );

/** Boutique choisie, ou la première enregistrée si aucune n'est précisée. */
function resolveShopId(interaction: { client: { RPG: ChatInputCommandInteraction["client"]["RPG"] } }, chosen: string | null) {
    const shops = interaction.client.RPG.shops;
    if (chosen && shops.has(chosen)) return chosen;
    return shops.list()[0]?.id;
}

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const focused = interaction.options.getFocused(true);

    if (focused.name === "shop") {
        await suggest(
            interaction,
            world.shops.list().map((s) => ({ name: contentName(locale, "shop", s.id, s.name), value: s.id })),
        );
        return;
    }

    const shopId = resolveShopId(interaction, interaction.options.getString("shop"));
    if (!shopId) return suggest(interaction, []);

    const buying = interaction.options.getSubcommand() === "buy";
    const owned = new Map<string, number>();
    if (!buying) {
        const player = await loadPlayer(interaction.client, interaction.user.id);
        for (const record of (await player?.inventory.getItems()) ?? []) {
            if (!record.isEquipped) owned.set(record.itemId, (owned.get(record.itemId) ?? 0) + record.quantity);
        }
    }

    const suggestions = world.shops
        .require(shopId)
        .listings.filter((l) => (buying ? l.price !== undefined : l.sellPrice !== undefined && owned.has(l.itemId)))
        .map((l) => {
            const item = world.shops.getItem(shopId, l.itemId);
            const name = item ? itemName(locale, item) : l.itemId;
            return { name: buying ? name : `${name} (x${owned.get(l.itemId) ?? 0})`, value: l.itemId };
        });
    await suggest(interaction, suggestions);
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    const shopId = resolveShopId(interaction, interaction.options.getString("shop"));
    if (!shopId) {
        await interaction.reply(reply(panel(withEmoji("error", t(locale, "shop.none"))), { ephemeral: true }));
        return;
    }
    const shop = world.shops.require(shopId);
    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
        const description = contentName(locale, "shop", shop.id, shop.name);
        const lines = shop.listings.map((listing) => {
            const item = world.shops.getItem(shop.id, listing.itemId);
            const name = item ? itemName(locale, item) : listing.itemId;
            const text = item ? itemDescription(locale, item) : undefined;
            const parts = [
                listing.price !== undefined
                    ? t(locale, "shop.buyPrice", { price: goldText(locale, listing.price) })
                    : t(locale, "shop.notForSale"),
                listing.sellPrice !== undefined
                    ? t(locale, "shop.sellPrice", { price: goldText(locale, listing.sellPrice) })
                    : null,
                listing.minLevel !== undefined ? t(locale, "shop.minLevel", { level: listing.minLevel }) : null,
            ].filter(Boolean);
            return `**${name}** — ${parts.join(" • ")}${text ? `\n  *${text}*` : ""}`;
        });
        await sendPaged(interaction, locale, {
            title: withEmoji("shop", description),
            intro: contentDescription(locale, "shop", shop.id, shop.description),
            lines,
            perPage: 6,
        });
        return;
    }

    const itemId = interaction.options.getString("item", true);
    const quantity = interaction.options.getInteger("quantity") ?? 1;
    const item = world.shops.getItem(shop.id, itemId);
    const name = item ? itemName(locale, item) : itemId;

    if (sub === "buy") {
        const result = await world.shops.buy(player, shop.id, itemId, quantity);
        await persist(interaction.client, player);
        await interaction.reply(
            reply(
                panel(
                    withEmoji(
                        "shop",
                        t(locale, "shop.bought", {
                            quantity: result.quantity,
                            item: name,
                            total: goldText(locale, result.totalPrice),
                            gold: goldText(locale, result.gold),
                        }),
                    ),
                ),
            ),
        );
        return;
    }

    const result = await world.shops.sell(player, shop.id, itemId, quantity);
    await persist(interaction.client, player);
    await interaction.reply(
        reply(
            panel(
                withEmoji(
                    "shop",
                    t(locale, "shop.sold", {
                        quantity: result.quantity,
                        item: name,
                        total: goldText(locale, result.totalPrice),
                        gold: goldText(locale, result.gold),
                    }),
                ),
            ),
        ),
    );
}
