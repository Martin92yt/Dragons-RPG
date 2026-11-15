import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
} from "discord.js";
import { categoryIcon, emoji, emojiData } from "../core/emojis";
import { categoryLabel, goldText, itemDescription, itemName } from "../core/format";
import { wrap } from "../core/text";
import type { Player } from "../core/player";
import { contentDescription, contentName } from "../i18n/content";
import { t, type Locale } from "../i18n";

export const SHOP_PAGE_SIZE = 5;

export interface ShopState {
    /** Catégorie filtrée, ou `all`. */
    category: string;
    page: number;
    /** Ligne de retour de la dernière action (achat réussi...), affichée sous le titre. */
    note?: string;
}

type World = Player["worldInstance"];

/** Objets de la boutique qui se vendent au joueur (avec un prix d'achat), filtrés par catégorie. */
export function shopItems(world: World, shopId: string, category: string) {
    return world.shops
        .require(shopId)
        .listings.filter((listing) => listing.price !== undefined)
        .flatMap((listing) => {
            const item = world.shops.getItem(shopId, listing.itemId);
            return item && (category === "all" || item.category === category) ? [{ listing, item }] : [];
        });
}

/**
 * Vue de la boutique : titre et or du joueur, filtre par catégorie, cinq objets par page avec leur bouton
 * « Acheter » à droite, puis la navigation. Pour changer la mise en page d'un objet, modifier `itemText`.
 */
export function shopView(locale: Locale, world: World, player: Player, shopId: string, state: ShopState): ContainerBuilder {
    const shop = world.shops.require(shopId);
    const all = shopItems(world, shopId, "all");
    const items = shopItems(world, shopId, state.category);
    const pages = Math.max(1, Math.ceil(items.length / SHOP_PAGE_SIZE));
    const page = Math.min(state.page, pages - 1);
    const visible = items.slice(page * SHOP_PAGE_SIZE, (page + 1) * SHOP_PAGE_SIZE);

    const description = contentDescription(locale, "shop", shop.id, shop.description);
    const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            [
                `## ${emoji("shop")} ${contentName(locale, "shop", shop.id, shop.name)}`,
                description ? `-# ${description}` : null,
                `${emoji("gold")} **${goldText(locale, player.gold)}**`,
                state.note ?? null,
            ]
                .filter(Boolean)
                .join("\n"),
        ),
    );

    const categories = [...new Set(all.map(({ item }) => item.category))];
    if (categories.length > 1) {
        container.addActionRowComponents(
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("shop:category")
                    .setPlaceholder(t(locale, "shop.categoryPlaceholder"))
                    .addOptions([
                        { label: t(locale, "shop.allCategories"), value: "all", emoji: emojiData("menu"), default: state.category === "all" },
                        ...categories.map((category) => ({
                            label: categoryLabel(locale, category),
                            value: category,
                            emoji: emojiData(categoryIcon(category)),
                            default: state.category === category,
                        })),
                    ]),
            ),
        );
    }

    for (const { listing, item } of visible) {
        const tooLow = listing.minLevel !== undefined && player.level < listing.minLevel;
        const poor = player.gold < (listing.price ?? 0);
        container
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(itemText(locale, listing, item, tooLow)))
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId(`shop:buy:${item.itemId}`)
                            .setLabel(t(locale, "shop.buyButton"))
                            .setEmoji(emojiData("buy"))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(tooLow || poor),
                    ),
            );
    }
    if (visible.length === 0) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(t(locale, "common.empty")));

    if (pages > 1) {
        container
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addActionRowComponents(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("shop:prev").setEmoji(emojiData("previous")).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                    new ButtonBuilder().setCustomId("shop:page").setLabel(`${page + 1}/${pages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId("shop:next").setEmoji(emojiData("next")).setStyle(ButtonStyle.Secondary).setDisabled(page >= pages - 1),
                ),
            );
    }
    return container;
}

function itemText(
    locale: Locale,
    listing: { price?: number; minLevel?: number },
    item: Parameters<typeof itemName>[1] & Parameters<typeof itemDescription>[1] & { category: string },
    locked: boolean,
): string {
    const details = [
        `${emoji("gold")} **${listing.price}**`,
        listing.minLevel !== undefined ? `${emoji(locked ? "vault" : "level")} ${t(locale, "shop.minLevelShort", { level: listing.minLevel })}` : null,
    ]
        .filter(Boolean)
        .join("  •  ");
    const description = itemDescription(locale, item);
    return [`### ${emoji(categoryIcon(item.category))} ${itemName(locale, item)}`, details, description ? `-# ${wrap(description, 60)}` : null]
        .filter(Boolean)
        .join("\n");
}
