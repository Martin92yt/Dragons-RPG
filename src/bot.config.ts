/**
 * Configuration propre au bot Discord (distincte de `config.ts`, qui configure le monde de la librairie).
 */
export const BOT = {
    name: "Dragons RPG",
    version: "1.0.0",
    /** Identifiant Discord du propriétaire (variable d'environnement `OwnerID`) : seul à pouvoir utiliser /owner. */
    get ownerId(): string {
        // Lu à la demande : dotenv est chargé après l'import de ce module.
        return process.env.OwnerID ?? "";
    },
    links: {
        bot: "https://github.com/Martin92yt/Dragons-RPG",
        library: "https://github.com/Martin92yt/DragonsOfLegends.js",
        gifuto: "https://gifuto.vercel.app",
    },
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
