import type { InventoryItemRecord, Item } from "dragons-of-legends.js";
import { contentName, contentDescription } from "../i18n/content";
import { t, type Locale } from "../i18n";

export function intl(locale: Locale): string {
    return locale === "fr" ? "fr-FR" : "en-US";
}

/** Nombre avec séparateurs de milliers de la langue. */
export function num(locale: Locale, value: number): string {
    return Math.round(value).toLocaleString(intl(locale));
}

/** Date-heure Discord relative (`<t:...:R>`) à partir d'un timestamp en ms. */
export function relativeTime(ms: number): string {
    return `<t:${Math.floor(ms / 1000)}:R>`;
}

/** Date Discord complète (`<t:...:D>`). */
export function fullDate(ms: number): string {
    return `<t:${Math.floor(ms / 1000)}:D>`;
}

export function rarityLabel(locale: Locale, rarity: string): string {
    return t(locale, `rarity.${rarity}` as Parameters<typeof t>[1]);
}

export function categoryLabel(locale: Locale, category: string): string {
    return t(locale, `category.${category}` as Parameters<typeof t>[1]);
}

export function slotLabel(locale: Locale, slot: string): string {
    return t(locale, `slot.${slot}` as Parameters<typeof t>[1]);
}

export function attributeLabel(locale: Locale, attribute: string): string {
    return t(locale, `attribute.${attribute}` as Parameters<typeof t>[1]);
}

export function tierLabel(locale: Locale, tier: string | undefined): string {
    return tier ? t(locale, `tier.${tier}` as Parameters<typeof t>[1]) : t(locale, "common.unknown");
}

export function locationName(locale: Locale, id: string): string {
    return contentName(locale, "location", id, id);
}

export function itemName(locale: Locale, item: Pick<Item, "itemId" | "name">): string {
    return contentName(locale, "item", item.itemId, item.name);
}

export function itemDescription(locale: Locale, item: Pick<Item, "itemId" | "description">): string | undefined {
    return contentDescription(locale, "item", item.itemId, item.description);
}

/** `**3x** Potion de soin • Commun`. */
export function itemLine(locale: Locale, record: InventoryItemRecord): string {
    const durability = record.itemNbtData?.durability;
    const parts = [
        `**${record.quantity}x** ${itemName(locale, record)}`,
        rarityLabel(locale, record.rarity),
        typeof durability === "number" ? `${t(locale, "common.durability")} ${Math.round(durability)}%` : null,
        record.isEquipped && record.equipmentSlot
            ? `${t(locale, "common.equipped")} (${slotLabel(locale, record.equipmentSlot)})`
            : null,
    ].filter(Boolean);
    return `• ${parts.join(" • ")}`;
}

/** Libellé d'un coût en or : `120 or` / `Gratuit`. */
export function goldText(locale: Locale, amount: number | undefined): string {
    if (amount === undefined) return t(locale, "common.unknown");
    return `${num(locale, amount)} ${t(locale, "common.gold")}`;
}
