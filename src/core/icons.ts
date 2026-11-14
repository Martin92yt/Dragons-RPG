import type { EmojiKey } from "./emojis";

/**
 * Alias sémantiques : le code du bot parle de rôles (`gold`, `combat`, `bank`...),
 * ce fichier décide quel emoji du registre (`emojis.registry.ts`) l'illustre.
 *
 * Changer l'illustration d'un rôle = modifier une seule ligne ici.
 * Chaque valeur est une clé du registre : TypeScript refuse de compiler si elle n'existe pas.
 */
export const ICONS = {
    // ── Personnage ──────────────────────────────────────────────────────────
    character: "useravatar",
    level: "level",
    experience: "experience",
    health: "healthpoints",
    gold: "ingot",
    bankGold: "starcoin",
    location: "location",
    skillPoints: "skillPoints",
    strength: "broadsword",
    agility: "warriorbootslv1",
    intelligence: "light",
    defense: "shield",
    title: "crown",
    marriage: "ring",
    // ── États ───────────────────────────────────────────────────────────────
    dead: "skull",
    combat: "sword",
    travel: "compass",
    jobs: "toolkit",
    cooldown: "time",
    // ── Systèmes ────────────────────────────────────────────────────────────
    inventory: "backpack",
    equipment: "warriorchestplatelv1",
    bank: "bank",
    vault: "lock",
    shop: "shop",
    lootbox: "chest",
    achievement: "trophy",
    bestiary: "book",
    effect: "potion",
    map: "map",
    tool: "wrench",
    fishing: "fishhook",
    admin: "settings",
    // ── Combat ──────────────────────────────────────────────────────────────
    enemy: "demon",
    attack: "sword",
    victory: "star",
    defeat: "skull",
    flee: "door",
    // ── Retours d'état ──────────────────────────────────────────────────────
    error: "exclamation",
    success: "tick",
    friends: "friends",
    shuffle: "refresh",
} as const satisfies Record<string, EmojiKey>;

export type Icon = keyof typeof ICONS;
