import type World from "dragons-of-legends.js";
import { goldText, itemName } from "./format";
import type { Locale } from "../i18n";

export type LootboxOpenResult = Awaited<ReturnType<World["lootboxes"]["open"]>>;

/** Emplacements d'équipement de la librairie, dans l'ordre d'affichage. */
export const EQUIPMENT_SLOTS = [
    "helmet",
    "chest",
    "leggings",
    "boots",
    "sword",
    "shield",
    "amulet1",
    "amulet2",
    "amulet3",
] as const;
export type EquipmentSlotId = (typeof EQUIPMENT_SLOTS)[number];

/**
 * Regroupe le contenu d'une ou plusieurs pochettes ouvertes : l'or est cumulé, les objets identiques sont fusionnés.
 */
export function describeRewards(locale: Locale, results: readonly LootboxOpenResult[]): string[] {
    let gold = 0;
    const items = new Map<string, { name: string; quantity: number }>();

    for (const result of results) {
        for (const reward of result.rewards) {
            if (reward.kind === "gold") {
                gold += reward.amount;
                continue;
            }
            const current = items.get(reward.item.itemId);
            if (current) current.quantity += reward.quantity;
            else items.set(reward.item.itemId, { name: itemName(locale, reward.item), quantity: reward.quantity });
        }
    }

    const lines = [...items.values()].map((entry) => `• **${entry.quantity}x** ${entry.name}`);
    if (gold > 0) lines.unshift(`• ${goldText(locale, gold)}`);
    return lines;
}
