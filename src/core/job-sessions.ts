import { BOT } from "../bot.config";

interface JobSession {
    readonly jobId: string;
    readonly endsAt: number;
}

const sessions = new Map<string, JobSession>();

/** Session de job en cours pour ce joueur, si elle n'est pas terminée. */
export function getJobSession(playerId: string): (JobSession & { remainingMs: number }) | undefined {
    const session = sessions.get(playerId);
    if (!session) return undefined;
    const remainingMs = session.endsAt - Date.now();
    if (remainingMs <= 0) {
        sessions.delete(playerId);
        return undefined;
    }
    return { ...session, remainingMs };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Verrouille le joueur pendant toute la durée d'un job.
 *
 * - Le verrou est posé immédiatement (un double clic ne lance pas deux jobs : `null` est retourné).
 * - `work` est exécuté tout de suite pour que ses erreurs (cooldown, niveau, outil...) remontent sans attente ;
 *   le verrou est alors relâché aussitôt.
 * - En cas de succès, le joueur reste verrouillé jusqu'à `max(durationMs, minDurationMs)`.
 *
 * @returns Le résultat de `work`, ou `null` si le joueur travaillait déjà.
 */
export async function runJobSession<T>(
    playerId: string,
    jobId: string,
    work: () => Promise<T>,
    durationMs: number = BOT.jobs.minDurationMs,
): Promise<T | null> {
    if (getJobSession(playerId)) return null;

    const duration = Math.max(durationMs, BOT.jobs.minDurationMs);
    const startedAt = Date.now();
    sessions.set(playerId, { jobId, endsAt: startedAt + duration });

    try {
        const result = await work();
        const left = startedAt + duration - Date.now();
        if (left > 0) await sleep(left);
        return result;
    } finally {
        sessions.delete(playerId);
    }
}
