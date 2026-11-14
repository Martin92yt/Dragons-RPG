import { ItemCategory, ItemRarity, defineContentPack } from "dragons-of-legends.js";

/**
 * Pack de contenu propre à Dragons RPG, chargé après le pack officiel :
 * quelques consommables plus intéressants que la simple potion de soin, et une boutique d'alchimiste.
 */
export const dragonsPack = defineContentPack({
    id: "dragons-rpg",
    name: "Dragons RPG",
    version: "1.0.0",
    effects: [
        {
            id: "focus",
            name: "Focus",
            description: "Raises your critical rate for 3 minutes.",
            durationMs: 3 * 60_000,
            modifiers: { critRateBonus: 15 },
        },
        {
            id: "fortune",
            name: "Fortune",
            description: "Raises your luck for 10 minutes.",
            durationMs: 10 * 60_000,
            modifiers: { luckPercent: 25 },
        },
    ],
    items: [
        {
            itemId: "greater_health_potion",
            name: "Greater Health Potion",
            category: ItemCategory.Consumables,
            rarity: ItemRarity.Uncommon,
            maxStack: 16,
            description: "Instantly restores 90 health points.",
            use: { heal: 90 },
        },
        {
            itemId: "focus_elixir",
            name: "Focus Elixir",
            category: ItemCategory.Consumables,
            rarity: ItemRarity.Uncommon,
            maxStack: 16,
            description: "Raises your critical rate by 15% for 3 minutes.",
            use: { effects: ["focus"] },
        },
        {
            itemId: "fortune_elixir",
            name: "Fortune Elixir",
            category: ItemCategory.Consumables,
            rarity: ItemRarity.Rare,
            maxStack: 16,
            description: "Raises your luck by 25% for 10 minutes.",
            use: { effects: ["fortune"] },
        },
    ],
    shops: [
        {
            id: "alchemist",
            name: "Alchemist",
            description: "Elixirs and potions for the road ahead.",
            listings: [
                { itemId: "greater_health_potion", price: 70, sellPrice: 28, minLevel: 3 },
                { itemId: "focus_elixir", price: 160, sellPrice: 60, minLevel: 4 },
                { itemId: "fortune_elixir", price: 320, sellPrice: 130, minLevel: 6 },
            ],
        },
    ],
});
