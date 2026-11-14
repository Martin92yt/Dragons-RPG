import type { ChatInputCommandInteraction, Client } from "discord.js";
import type { PlayerManager } from "dragons-of-legends.js";
import { withEmoji } from "./emojis";
import { playerIdOf } from "./guard";
import { panel, reply } from "./ui";
import { resolveLocale, t } from "../i18n";

/** Entité joueur telle que renvoyée par le monde. */
export type Player = NonNullable<Awaited<ReturnType<PlayerManager["get"]>>>;

/** Identifiant Discord de l'utilisateur à partir de l'identifiant joueur (`guildId_userId`). */
export function userIdOf(playerId: string): string {
    return playerId.slice(playerId.indexOf("_") + 1);
}

export async function loadPlayer(
    client: Client,
    guildId: string,
    userId: string,
): Promise<Player | undefined> {
    return client.RPG.players.get(playerIdOf(guildId, userId));
}

/**
 * Charge le personnage de l'utilisateur qui lance la commande.
 * S'il n'en a pas, répond (message éphémère) et retourne `null` : la commande doit alors s'arrêter.
 */
export async function requirePlayer(interaction: ChatInputCommandInteraction): Promise<Player | null> {
    const player = await loadPlayer(interaction.client, interaction.guildId!, interaction.user.id);
    if (player) return player;

    const locale = resolveLocale(interaction.locale);
    await interaction.reply(
        reply(panel(withEmoji("error", t(locale, "error.noCharacter"))), { ephemeral: true }),
    );
    return null;
}

/**
 * Charge le personnage d'un autre utilisateur (ou le sien). Répond et retourne `null` s'il n'en a pas.
 */
export async function requireTargetPlayer(
    interaction: ChatInputCommandInteraction,
    userId: string,
): Promise<Player | null> {
    if (userId === interaction.user.id) return requirePlayer(interaction);

    const player = await loadPlayer(interaction.client, interaction.guildId!, userId);
    if (player) return player;

    const locale = resolveLocale(interaction.locale);
    await interaction.reply(
        reply(
            panel(withEmoji("error", t(locale, "error.noCharacterOther", { user: `<@${userId}>` }))),
            { ephemeral: true },
        ),
    );
    return null;
}

/**
 * Sauvegarde un joueur : la librairie ne persiste pas automatiquement chaque modification
 * (seulement à la création, à la déchargeure d'inactivité et à l'arrêt), le bot s'en charge.
 */
export async function persist(client: Client, player: Player): Promise<void> {
    await client.RPG.players.save(player);
}
