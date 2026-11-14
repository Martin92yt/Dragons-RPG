/**
 * Registre des emojis custom du bot.
 *
 * Règles :
 * - uniquement des emojis custom Discord au format `<:nom:id>` ;
 * - aucun emoji Unicode, jamais, y compris en repli ;
 * - un emoji dont l'ID est encore `TODO` est rendu comme une chaîne vide (et signalé une fois au démarrage).
 *
 * Pour brancher un emoji : remplacer `TODO` par son ID. Aucun autre fichier n'est à modifier.
 */
const TODO = "TODO";

const REGISTRY = {
    // ── Déjà utilisés dans le bot ───────────────────────────────────────────
    user: { name: "user", id: "1570841944500994249" },
    level: { name: "level", id: "1570840937859387465" },
    experience: { name: "experiencepoints", id: "1570840935376355542" },
    health: { name: "healthpoints", id: "1570840936680792064" },
    gold: { name: "ingot", id: "1570840429296095495" },
    location: { name: "location", id: "1570844436689068174" },
    skillPoints: { name: "skillpoints", id: "1570840939377721355" },
    strength: { name: "broadsword", id: "1570846340546826341" },
    agility: { name: "warriorbootslv1", id: "1570846338055409815" },
    intelligence: { name: "light", id: "1570846476597203045" },
    defense: { name: "shield", id: "1570846339217100950" },
    fishing: { name: "fishhook", id: "1570852266292936834" },

    // ── À fournir (placeholders) ────────────────────────────────────────────
    dragon: { name: "dragon", id: TODO },
    info: { name: "info", id: TODO },
    link: { name: "link", id: TODO },
    github: { name: "github", id: TODO },
    server: { name: "server", id: TODO },
    ping: { name: "ping", id: TODO },
    memory: { name: "memory", id: TODO },
    uptime: { name: "uptime", id: TODO },
    version: { name: "version", id: TODO },
    dead: { name: "dead", id: TODO },
    combat: { name: "combat", id: TODO },
    travel: { name: "travel", id: TODO },
    jobs: { name: "jobs", id: TODO },
    error: { name: "error", id: TODO },
    inventory: { name: "inventory", id: TODO },
    equipment: { name: "equipment", id: TODO },
    bank: { name: "bank", id: TODO },
    vault: { name: "vault", id: TODO },
    shop: { name: "shop", id: TODO },
    lootbox: { name: "lootbox", id: TODO },
    title: { name: "title", id: TODO },
    achievement: { name: "achievement", id: TODO },
    bestiary: { name: "bestiary", id: TODO },
    effect: { name: "effect", id: TODO },
    marriage: { name: "marriage", id: TODO },
    character: { name: "character", id: TODO },
    map: { name: "map", id: TODO },
    enemy: { name: "enemy", id: TODO },
    attack: { name: "attack", id: TODO },
    victory: { name: "victory", id: TODO },
    defeat: { name: "defeat", id: TODO },
    flee: { name: "flee", id: TODO },
    tool: { name: "tool", id: TODO },
    cooldown: { name: "cooldown", id: TODO },
    admin: { name: "admin", id: TODO },
    success: { name: "success", id: TODO },
} as const satisfies Record<string, { name: string; id: string }>;

export type EmojiKey = keyof typeof REGISTRY;

const warned = new Set<EmojiKey>();

/**
 * Retourne l'emoji custom `<:nom:id>` correspondant à la clé, ou une chaîne vide si l'ID n'est pas encore renseigné.
 */
export function emoji(key: EmojiKey): string {
    const entry = REGISTRY[key];
    if (entry.id === TODO) {
        warned.add(key);
        return "";
    }
    return `<:${entry.name}:${entry.id}>`;
}

/** Préfixe un texte avec un emoji, sans laisser d'espace orphelin si l'emoji est un placeholder. */
export function withEmoji(key: EmojiKey, text: string): string {
    const e = emoji(key);
    return e ? `${e} ${text}` : text;
}

/** Liste les clés dont l'ID reste à renseigner. */
export function missingEmojis(): EmojiKey[] {
    return (Object.keys(REGISTRY) as EmojiKey[]).filter((k) => REGISTRY[k].id === TODO);
}
