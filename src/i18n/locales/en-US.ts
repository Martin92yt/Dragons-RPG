import type { MessageKey } from "./fr";

export const enUS: Record<MessageKey, string> = {
    // ── Guards ──────────────────────────────────────────────────────────────
    "guard.dead": "You are dead. You will be able to act again {time}.",
    "guard.deadPermanent": "You are permanently dead. Nothing more can be done.",
    "guard.combat": "You are in the middle of a fight. Finish it before doing anything else.",
    "guard.travel": "You are travelling. Wait until you reach your destination.",
    "guard.jobs": "You are busy working ({job}). Come back {time}.",
    "guard.title": "Action unavailable",

    // ── Errors ──────────────────────────────────────────────────────────────
    "error.generic": "Something went wrong while running this command.",
    "error.guildOnly": "This command can only be used in a server.",
    "error.title": "Error",

    // ── Durations ───────────────────────────────────────────────────────────
    "time.soon": "in a moment",
    "time.in": "in {value}",

    // ── /about ──────────────────────────────────────────────────────────────
    "about.command.description": "Learn about the Dragons RPG project.",
    "about.title": "Dragons RPG",
    "about.universe":
        "A dark, minimal text RPG. Explore the world, work, travel, fight and become a legend, all without leaving Discord.",
    "about.engine":
        "The bot is built on **dragons-of-legends.js**, an open source TypeScript library for creating text-based RPGs.",
    "about.links": "Links",
    "about.link.bot": "Bot source code",
    "about.link.library": "dragons-of-legends.js library",
    "about.author": "Created by {author}",

    // ── /info ───────────────────────────────────────────────────────────────
    "info.command.description": "Show the bot's statistics and status.",
    "info.title": "Information",
    "info.version": "Bot version",
    "info.library": "Library version",
    "info.health": "Health",
    "info.health.ok": "Operational",
    "info.health.degraded": "Degraded",
    "info.ping": "Latency",
    "info.uptime": "Online since",
    "info.memory": "Memory",
    "info.servers": "Servers",
    "info.players": "Players in memory",
    "info.node": "Node.js",
    "info.locale": "Language",

    // ── Jobs ────────────────────────────────────────────────────────────────
    "jobs.started": "You start working. You are busy for {duration}.",
    "jobs.alreadyBusy": "You are already working.",
    "jobs.finished": "Session complete",
    "jobs.loot": "Loot gathered",
    "jobs.nothing": "Nothing this time.",

    // ── Passive XP ──────────────────────────────────────────────────────────
    "xp.levelUp": "{user} reached level {level}.",
};
