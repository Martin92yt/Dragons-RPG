import type { Client } from "discord.js";
import { getJobSession } from "./job-sessions";

/** États qui interdisent toute action, par ordre de priorité d'affichage. */
export type BlockingState = "dead" | "combat" | "travel" | "jobs";

export type GuardResult =
    | { readonly ok: true }
    | {
          readonly ok: false;
          readonly state: BlockingState;
          /** Temps restant en ms quand il est connu (`Infinity` pour une mort définitive). */
          readonly remainingMs?: number;
          /** Identifiant du job en cours (état `jobs`). */
          readonly jobId?: string;
      };

/**
 * Identifiant du joueur dans le monde.
 * Le profil est global : un seul personnage par utilisateur Discord, partagé entre tous les serveurs
 * (et les messages privés). C'est le seul endroit à changer pour repasser à un profil par serveur.
 */
export function playerIdOf(userId: string): string {
    return userId;
}

/**
 * Détermine si un joueur peut agir. Source de vérité unique, utilisée par le middleware et l'XP passive.
 *
 * Les états mort, combat et voyage viennent de la librairie ; l'état job est porté par le bot.
 * Un joueur qui n'existe pas encore n'a aucun état bloquant.
 */
export async function checkPlayerState(client: Client, playerId: string): Promise<GuardResult> {
    const world = client.RPG;
    const player = await world.players.get(playerId);

    if (player?.life.isDead) {
        return {
            ok: false,
            state: "dead",
            remainingMs: player.life.isPermanentlyDead ? Infinity : player.life.getRemainingMs(),
        };
    }

    if (world.combat.has(playerId)) return { ok: false, state: "combat" };

    if (player?.isTravelling) return { ok: false, state: "travel" };

    const job = getJobSession(playerId);
    if (job) return { ok: false, state: "jobs", remainingMs: job.remainingMs, jobId: job.jobId };

    return { ok: true };
}
