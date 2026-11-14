/**
 * Langue de référence : toutes les autres locales doivent implémenter exactement ces clés.
 * Les variables s'écrivent `{nom}`.
 */
export const fr = {
    // ── Guards ──────────────────────────────────────────────────────────────
    "guard.dead": "Tu es mort. Tu pourras agir de nouveau {time}.",
    "guard.deadPermanent": "Tu es mort définitivement. Plus rien n'est possible.",
    "guard.combat": "Tu es en plein combat. Termine-le avant de faire autre chose.",
    "guard.travel": "Tu es en voyage. Attends d'être arrivé à destination.",
    "guard.jobs": "Tu es occupé à travailler ({job}). Reviens {time}.",
    "guard.title": "Action impossible",

    // ── Erreurs ─────────────────────────────────────────────────────────────
    "error.generic": "Une erreur est survenue lors de l'exécution de cette commande.",
    "error.guildOnly": "Cette commande n'est utilisable que dans un serveur.",
    "error.title": "Erreur",

    // ── Durées ──────────────────────────────────────────────────────────────
    "time.soon": "dans un instant",
    "time.in": "dans {value}",

    // ── /about ──────────────────────────────────────────────────────────────
    "about.command.description": "Présente le projet Dragons RPG.",
    "about.title": "Dragons RPG",
    "about.universe":
        "Un RPG textuel sombre et épuré. Explore le monde, travaille, voyage, combats et deviens une légende, sans quitter Discord.",
    "about.engine":
        "Le bot repose sur **dragons-of-legends.js**, une librairie TypeScript open source pour créer des RPG textuels.",
    "about.links": "Liens",
    "about.link.bot": "Code du bot",
    "about.link.library": "Librairie dragons-of-legends.js",
    "about.author": "Créé par {author}",

    // ── /info ───────────────────────────────────────────────────────────────
    "info.command.description": "Affiche les statistiques et l'état du bot.",
    "info.title": "Informations",
    "info.version": "Version du bot",
    "info.library": "Version de la librairie",
    "info.health": "État de santé",
    "info.health.ok": "Opérationnel",
    "info.health.degraded": "Dégradé",
    "info.ping": "Latence",
    "info.uptime": "En ligne depuis",
    "info.memory": "Mémoire",
    "info.servers": "Serveurs",
    "info.players": "Joueurs en mémoire",
    "info.node": "Node.js",
    "info.locale": "Langue",

    // ── Jobs ────────────────────────────────────────────────────────────────
    "jobs.started": "Tu commences à travailler. Tu es occupé pendant {duration}.",
    "jobs.alreadyBusy": "Tu es déjà en train de travailler.",
    "jobs.finished": "Session terminée",
    "jobs.loot": "Butin récolté",
    "jobs.nothing": "Rien cette fois-ci.",

    // ── XP passive ──────────────────────────────────────────────────────────
    "xp.levelUp": "{user} passe au niveau {level}.",
} as const;

export type MessageKey = keyof typeof fr;
