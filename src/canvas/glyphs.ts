import { loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REGISTRY } from "../core/emojis.registry";
import { resolve, type EmojiKey, type RegistryKey } from "../core/emojis";
import { IMAGES_DIR } from "./theme";

/**
 * Glyphes des emojis dessinés dans les cartes canvas.
 *
 * Les PNG de `images/` (blancs sur fond transparent) portent le même nom que les emojis, mais en kebab-case
 * (`experience-points.png`) : on les retrouve en normalisant (minuscules, uniquement lettres et chiffres)
 * le nom de l'emoji du registre. Rien n'est jamais téléversé sur Discord : ce sont de simples fichiers locaux,
 * donc aucun impact sur les limites de l'API.
 */
const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

let index: Map<string, string> | undefined;
function files(): Map<string, string> {
    if (!index) {
        index = new Map();
        if (existsSync(IMAGES_DIR)) {
            for (const file of readdirSync(IMAGES_DIR)) if (file.endsWith(".png")) index.set(normalise(file.slice(0, -4)), file);
        }
    }
    return index;
}

const cache = new Map<string, Promise<Image | undefined>>();

/** Charge le glyphe d'une clé (alias ou registre) ; `undefined` si le fichier n'existe pas. */
export function glyph(key: EmojiKey): Promise<Image | undefined> {
    const registryKey = resolve(key);
    let pending = cache.get(registryKey);
    if (!pending) {
        const file = files().get(normalise(REGISTRY[registryKey].name)) ?? files().get(normalise(registryKey));
        pending = file ? loadImage(join(IMAGES_DIR, file)).catch(() => undefined) : Promise.resolve(undefined);
        cache.set(registryKey, pending);
    }
    return pending;
}

/** Dessine un glyphe dans un carré `size` dont le coin haut-gauche est (x, y). */
export async function drawGlyph(ctx: SKRSContext2D, key: EmojiKey, x: number, y: number, size: number, alpha = 1): Promise<boolean> {
    const image = await glyph(key);
    if (!image) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
    return true;
}

/**
 * Portrait de chaque ennemi du jeu officiel. Un ennemi ajouté par un pack retombe sur le glyphe de son palier ;
 * une illustration `images/enemies/<type>.png` reste prioritaire (voir `images.ts`).
 */
const ENEMY_GLYPHS: Record<string, RegistryKey> = {
    goblin: "mace",
    wolf: "wolf",
    slime: "water",
    bandit: "dagger",
    giant_rat: "mouse",
    wild_boar: "pig",
    skeleton: "bone",
    spider: "bug",
    orc: "baseballbat",
    ghost: "ghost",
    zombie: "gravestone",
    dark_cultist: "crystalball",
    troll: "hammer",
    minotaur: "cow",
    vampire: "night",
    witch: "wand03",
    stone_golem: "stone",
    lich: "skull",
    demon_lord: "demon",
    ancient_dragon: "fire",
    hydra: "boss",
};
const TIER_GLYPHS: Record<string, RegistryKey> = { beginner: "animal", intermediate: "demon02", advanced: "demon", boss: "boss" };

export const enemyGlyph = (type: string, tier?: string): RegistryKey => ENEMY_GLYPHS[type] ?? TIER_GLYPHS[tier ?? ""] ?? "boss";
