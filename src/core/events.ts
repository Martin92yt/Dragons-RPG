import { MessageFlags, type Client } from "discord.js";
import type World from "dragons-of-legends.js";
import type { GameEventName, GameEvents } from "dragons-of-legends.js";
import { contentName } from "../i18n/content";
import { emoji } from "./emojis";
import { userIdOf } from "./player";
import { panel, reply } from "./ui";
import { t, type Locale } from "../i18n";

// ── Capture d'événements ─────────────────────────────────────────────────────

export type AnyGameEvent = {
    [K in GameEventName]: { readonly name: K; readonly payload: GameEvents[K] };
}[GameEventName];

/**
 * Exécute une action de la librairie en enregistrant tous les événements de jeu qu'elle déclenche pour ce joueur.
 *
 * Plusieurs actions (utiliser un objet, un combat...) ne renvoient qu'un booléen ou un résultat partiel :
 * le détail (gain d'XP, effets appliqués, pochettes ouvertes...) n'existe que dans les événements.
 */
export async function captureEvents<T>(
    world: World,
    playerId: string,
    run: () => Promise<T>,
): Promise<{ result: T; events: AnyGameEvent[] }> {
    const events: AnyGameEvent[] = [];
    const stop = world.events.onAny((event) => {
        const payload = event.payload as { playerId?: string };
        if (payload.playerId === playerId) events.push(event as AnyGameEvent);
    });
    try {
        const result = await run();
        return { result, events };
    } finally {
        stop();
    }
}

/** Payloads d'un événement donné dans une capture. */
export function eventsNamed<K extends GameEventName>(events: readonly AnyGameEvent[], name: K): GameEvents[K][] {
    return events.filter((e) => e.name === name).map((e) => e.payload as GameEvents[K]);
}

// ── Mémoire du dernier salon ─────────────────────────────────────────────────

interface Presence {
    readonly channelId: string;
    readonly locale: Locale;
}

const presence = new Map<string, Presence>();

/** Retient où un joueur a été vu en dernier, pour lui adresser les notifications d'événements. */
export function rememberPresence(playerId: string, channelId: string, locale: Locale): void {
    presence.set(playerId, { channelId, locale });
}

// ── Notifications d'événements ───────────────────────────────────────────────

async function notify(client: Client, playerId: string, text: (locale: Locale) => string): Promise<void> {
    const known = presence.get(playerId);
    if (!known) return;

    const channel = await client.channels.fetch(known.channelId).catch(() => null);
    if (!channel?.isSendable()) return;

    await channel
        .send({
            components: reply(panel(text(known.locale))).components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { users: [userIdOf(playerId)] },
        })
        .catch(() => undefined);
}

/**
 * Branche les hooks d'événements de la librairie sur Discord.
 *
 * Seuls les événements qui n'ont pas de réponse de commande associée sont annoncés :
 * succès débloqués, résurrection automatique, fin d'un effet temporaire.
 * Le reste (niveau gagné, butin, voyage terminé...) est déjà montré par la commande qui l'a provoqué.
 */
export function registerEventHooks(client: Client): void {
    const { events } = client.RPG;

    events.on("achievementUnlock", ({ playerId, achievement }) =>
        notify(client, playerId, (locale) => {
            const name = contentName(locale, "achievement", achievement.id, achievement.name);
            return `${emoji("achievement")} ${t(locale, "notify.achievement", { user: `<@${userIdOf(playerId)}>`, name })}`.trim();
        }),
    );

    events.on("playerRevive", ({ playerId, reason, health }) => {
        if (reason !== "timer") return;
        return notify(client, playerId, (locale) =>
            t(locale, "notify.revive", { user: `<@${userIdOf(playerId)}>`, health }),
        );
    });

    events.on("effectExpire", ({ playerId, effect }) =>
        notify(client, playerId, (locale) =>
            t(locale, "notify.effectExpire", {
                user: `<@${userIdOf(playerId)}>`,
                name: contentName(locale, "effect", effect.id, effect.name),
            }),
        ),
    );
}
