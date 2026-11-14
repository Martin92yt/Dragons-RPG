/**
 * Configuration propre au bot Discord (distincte de `config.ts`, qui configure le monde de la librairie).
 */
export const BOT = {
    name: "Dragons RPG",
    version: "1.0.0",
    links: {
        bot: "https://github.com/Martin92yt/Dragons-RPG",
        library: "https://github.com/Martin92yt/DragonsOfLegends.js",
    },
    /** Couleur d'accent des containers : blanc, pour rester dans une charte monochrome. */
    jobs: {
        /** Durée minimale d'une session de job (le joueur est verrouillé pendant ce temps). */
        minDurationMs: 10_000,
    },
    xp: {
        /** Délai minimal entre deux gains d'XP pour un même joueur (anti-spam). */
        cooldownMs: 30_000,
        min: 5,
        max: 12,
        /** Les messages plus courts que ça ne rapportent rien. */
        minMessageLength: 5,
    },
} as const;
