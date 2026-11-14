import { ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, type Guild } from "discord.js";
import { BOT } from "../bot.config";
import { withEmoji } from "./emojis";
import { panel, reply, withButtons } from "./ui";
import { resolveLocale, t } from "../i18n";

/** Identifiant du bouton « Commencer l'aventure » du message de bienvenue (géré dans index.ts). */
export const WELCOME_START_ID = "welcome:start";

/**
 * Message de bienvenue envoyé quand le bot rejoint un serveur : présente le jeu et propose de commencer en un clic.
 * Salon choisi : le salon système, sinon le premier salon textuel où le bot peut écrire.
 */
export async function sendWelcome(guild: Guild): Promise<void> {
    const me = guild.members.me;
    if (!me) return;

    const canSend = (channel: NonNullable<Guild["systemChannel"]>) =>
        channel.permissionsFor(me).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]);

    const channel =
        (guild.systemChannel && canSend(guild.systemChannel) ? guild.systemChannel : undefined) ??
        guild.channels.cache.find(
            (c): c is NonNullable<Guild["systemChannel"]> => c.type === ChannelType.GuildText && canSend(c),
        );
    if (!channel) return;

    const locale = resolveLocale(guild.preferredLocale);
    const message = reply(
        withButtons(
            panel(
                `## ${withEmoji("sword", t(locale, "welcome.title"))}`,
                t(locale, "welcome.body", { library: BOT.links.library }),
                `-# ${t(locale, "welcome.hint")}`,
            ),
            new ButtonBuilder().setCustomId(WELCOME_START_ID).setLabel(t(locale, "welcome.start")).setStyle(ButtonStyle.Secondary),
        ),
    );
    await channel.send({ components: message.components, flags: message.flags[0] }).catch(() => undefined);
}
