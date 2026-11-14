import type { WorldOptions } from "dragons-of-legends.js";

const config: WorldOptions = {
    bestiary: {
        enabled: true,
    },
    checkUpdates: false,
    database: { adapter: 'file', name: "data" },
    deathCooldown: "10m",
    deathMode: 'loose',
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
