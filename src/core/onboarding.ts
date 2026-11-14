import type { Client } from "discord.js";
import { playerIdOf } from "./guard";
import { persist, type Player } from "./player";

/**
 * Crée le personnage d'un utilisateur (profil global) avec son titre de départ.
 * Partagé par `/character create` et par le parcours `/start`, pour que les deux donnent exactement le même départ.
 * Le titre est accordé et équipé ici, une seule fois, et non à chaque consultation du profil.
 */
export async function createCharacter(client: Client, userId: string, name: string, classId: string): Promise<Player> {
    const world = client.RPG;
    const player = await world.players.create({ id: playerIdOf(userId), name, playerClass: classId });
    if (world.titles.has("novice_adventurer")) {
        await player.titles.grant("novice_adventurer");
        await player.titles.equip("novice_adventurer");
    }
    await persist(client, player);
    return player;
}
