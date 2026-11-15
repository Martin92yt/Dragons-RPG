import { REGISTRY } from "./emojis.registry";
import { CATEGORY_ICONS, ICONS, JOB_ICONS, LOCATION_ICONS, type Icon } from "./icons";

/** Clé directe du registre d'emojis (`emojis.registry.ts`). */
export type RegistryKey = keyof typeof REGISTRY;

/**
 * Tout ce qui peut illustrer un texte : une clé du registre (`"share"`) ou un alias sémantique (`"gold"`, voir `icons.ts`).
 * Les alias sont prioritaires si un nom existe dans les deux.
 */
export type EmojiKey = RegistryKey | Icon;

/** Clé du registre derrière un alias ou une clé directe. */
export function resolve(key: EmojiKey): RegistryKey {
    return key in ICONS ? ICONS[key as Icon] : (key as RegistryKey);
}

/** Retourne l'emoji custom `<:nom:id>` correspondant à la clé. Format exact imposé : jamais d'emoji Unicode. */
export function emoji(key: EmojiKey): string {
    const entry = REGISTRY[resolve(key)];
    return `<:${entry.name}:${entry.id}>`;
}

/** Préfixe un texte avec un emoji. */
export function withEmoji(key: EmojiKey, text: string): string {
    return `${emoji(key)} ${text}`;
}

/** Données d'emoji pour les menus de sélection (`{ id, name }` au lieu de la forme `<:nom:id>`). */
export function emojiData(key: EmojiKey): { id: string; name: string } {
    const entry = REGISTRY[resolve(key)];
    return { id: entry.id, name: entry.name };
}

export const categoryIcon = (category: string): EmojiKey => CATEGORY_ICONS[category] ?? "inventory";
export const jobIcon = (jobId: string): EmojiKey => JOB_ICONS[jobId] ?? "jobs";
export const locationIcon = (type: string): EmojiKey => LOCATION_ICONS[type] ?? "location";
