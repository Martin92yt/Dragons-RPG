import type { Message } from "discord.js";
import { BOT } from "../bot.config";
import { checkPlayerState, playerIdOf } from "./guard";
import { resolveLocale, t } from "../i18n";
import { withEmoji } from "./emojis";

const lastGain = new Map<string, number>();

/** Nettoie périodiquement les cooldowns expirés pour ne pas faire grossir la Map indéfiniment. */
setInterval(() => {
    const limit = Date.now() - BOT.xp.cooldownMs;
    for (const [key, at] of lastGain) if (at < limit) lastGain.delete(key);
}, 5 * 60_000).unref();

/**
 * XP passive : un joueur gagne de l'XP en parlant, avec un cooldown anti-spam.
 *
 * Ignorés : bots, messages hors serveur, messages trop courts, joueurs sans profil
 * (le profil se crée avec une commande) et joueurs dans un état bloquant.
 */
export async function handleMessageXp(message: Message): Promise<void> {
    if (message.author.bot || !message.inGuild()) return;
    if (message.content.trim().length < BOT.xp.minMessageLength) return;

    const playerId = playerIdOf(message.guildId, message.author.id);

    const now = Date.now();
    const previous = lastGain.get(playerId) ?? 0;
    if (now - previous < BOT.xp.cooldownMs) return;
    // Posé avant les `await` : deux messages quasi simultanés ne peuvent pas passer tous les deux.
    lastGain.set(playerId, now);

    const client = message.client;
    const player = await client.RPG.players.get(playerId);
    if (!player) {
        lastGain.delete(playerId);
        return;
    }

    const state = await checkPlayerState(client, playerId);
    if (!state.ok) return;

    const amount = BOT.xp.min + Math.floor(Math.random() * (BOT.xp.max - BOT.xp.min + 1));
    const before = player.level;
    player.addXP(amount);
    await client.RPG.players.save(player);

    if (player.level > before && message.channel.isSendable()) {
        const locale = resolveLocale(message.guild?.preferredLocale);
        await message.channel
            .send({
                content: withEmoji(
                    "level",
                    t(locale, "xp.levelUp", { user: `<@${message.author.id}>`, level: player.level }),
                ),
                allowedMentions: { parse: [] },
            })
            .catch(() => undefined);
    }
}
