import { REGISTRY } from "./emojis.registry";

export type EmojiKey = keyof typeof REGISTRY;

/**
 * Retourne l'emoji custom `<:nom:id>` correspondant à la clé, ou une chaîne vide si l'ID n'est pas encore renseigné.
 */
export function emoji(key: EmojiKey): string {
    const entry = REGISTRY[key];
    
    return `<:${entry.name}:${entry.id}>`;
}

/** Préfixe un texte avec un emoji, sans laisser d'espace orphelin si l'emoji est un placeholder. */
export function withEmoji(key: EmojiKey, text: string): string {
    const e = emoji(key);
    return e ? `${e} ${text}` : text;
}