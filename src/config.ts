import { ItemRarity, type WorldOptions } from "dragons-of-legends.js";
import { dragonsPack } from "./content/pack";

const config: WorldOptions = {
    bestiary: {
        enabled: true,
    },
    checkUpdates: false,
    database: { adapter: 'file', name: "data" },
    // Mort : 3 minutes de pause, pénalité d'or et perte légère d'objets non équipés (rien sur le commun).
    deathCooldown: "3m",
    deathMode: 'loose',
    deathItemLoss: {
        enabled: true,
        protectEquipped: true,
        lossRates: {
            [ItemRarity.Common]: 0,
            [ItemRarity.Uncommon]: 10,
            [ItemRarity.Rare]: 20,
            [ItemRarity.Epic]: 35,
            [ItemRarity.Legendary]: 50,
        },
    },
    // Début de partie plus doux : plus de paliers faciles avant les boss.
    enemySpawnRules: [
        { belowLevel: 3, tiers: { beginner: 100 } },
        { belowLevel: 6, tiers: { beginner: 40, intermediate: 60 } },
        { belowLevel: 10, tiers: { intermediate: 70, advanced: 30 } },
        { belowLevel: Number.POSITIVE_INFINITY, tiers: { advanced: 85, boss: 15 } },
    ],
    packs: [dragonsPack],
    starterItems: { health_potion: 5, rusty_sword: 1 },
    officialPack: true,
    premadeAchievements: true,
    premadeClasses: true,
    premadeContent: true,
    premadeEnemies: true,
    premadeItems: true,
    premadeJobs: true,
    premadeMap: true,
    premadeTitles: true,
    regen: { cooldown: 10, enabled: true, rate: 0 },
    starterGold: 500,
}
export default config;
