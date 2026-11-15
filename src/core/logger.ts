import { createConsola } from "consola";

/**
 * Logger unique du bot. Un logger par domaine : `logger.withTag("combat")`.
 * Niveau réglable avec `LOG_LEVEL` (0 = erreurs seules … 4 = debug, 5 = trace).
 */
export const logger = createConsola({
    level: process.env.LOG_LEVEL ? Number(process.env.LOG_LEVEL) : 3,
    formatOptions: { date: true, colors: false },
}).withTag("dragons");

export const log = {
    bot: logger.withTag("bot"),
    command: logger.withTag("command"),
    combat: logger.withTag("combat"),
    deploy: logger.withTag("deploy"),
    save: logger.withTag("save"),
    xp: logger.withTag("xp"),
    anime: logger.withTag("anime"),
    welcome: logger.withTag("welcome"),
};
