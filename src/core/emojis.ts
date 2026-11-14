import { REGISTRY } from "./emojis.registry";
import { ICONS, type Icon } from "./icons";

/** Clé directe du registre d'emojis (`emojis.registry.ts`). */
export type RegistryKey = keyof typeof REGISTRY;

/**
 * Tout ce qui peut illustrer un texte : une clé du registre (`"share"`) ou un alias sémantique (`"gold"`, voir `icons.ts`).
 * Les alias sont prioritaires si un nom existe dans les deux.
 */
export type EmojiKey = RegistryKey | Icon;

function resolve(key: EmojiKey): RegistryKey {
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
