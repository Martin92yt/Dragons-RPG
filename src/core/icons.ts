import type { RegistryKey } from "./emojis";

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
    distance: "compass",
    danger: "skull",
    buy: "creditcard",
    plus: "plus",
    guide: "book",
    next: "arrowright",
    previous: "arrowleft",
    city: "town",
    village: "village",
    dungeon: "tower",
    classAttackStrength: "broadsword",
    classAttackAgility: "bow",
    classAttackIntelligence: "wand",
} as const satisfies Record<string, RegistryKey>;

export type Icon = keyof typeof ICONS;

/** Icône de chaque catégorie d'objet (boutique, inventaire). */
export const CATEGORY_ICONS: Record<string, Icon> = {
    weapons: "strength",
    armor: "defense",
    consumables: "effect",
    materials: "inventory",
    valuables: "gold",
    amulet: "title",
    tool: "tool",
};

/** Icône de chaque métier ; un métier ajouté par un pack retombe sur `jobs`. */
export const JOB_ICONS: Record<string, Icon | RegistryKey> = {
    fishing: "fishing",
    mining: "pickaxe",
    woodcutting: "axe",
};

/** Icônes des types de lieux (carte du monde). */
export const LOCATION_ICONS: Record<string, Icon> = {
    city: "city",
    village: "village",
    dungeon: "dungeon",
};

/**
 * Paliers d'une barre de progression : du vide au plein. Pour changer l'apparence des barres,
 * remplace ces clés du registre (une par palier, de 0 % à 100 %).
 */
export const PROGRESS_STEPS: readonly RegistryKey[] = ["progress", "progress02", "progress03", "progress04", "progress05"];
