import type { ChatInputCommandInteraction } from "discord.js";
import { checkPlayerState, playerIdOf, type GuardResult } from "./guard";
import { formatIn, resolveLocale, t, type Locale, type MessageKey } from "../i18n";
import { withEmoji, type EmojiKey } from "./emojis";
import { panel, reply } from "./ui";

const STATE_VIEW: Record<"dead" | "combat" | "travel" | "jobs", { emoji: EmojiKey; key: MessageKey }> = {
    dead: { emoji: "dead", key: "guard.dead" },
    combat: { emoji: "combat", key: "guard.combat" },
    travel: { emoji: "travel", key: "guard.travel" },
    jobs: { emoji: "jobs", key: "guard.jobs" },
};

function describeBlock(locale: Locale, result: Extract<GuardResult, { ok: false }>): string {
    if (result.state === "dead" && result.remainingMs === Infinity) {
        return t(locale, "guard.deadPermanent");
    }
    const view = STATE_VIEW[result.state];
    return t(locale, view.key, {
        time: formatIn(locale, result.remainingMs ?? 0),
        job: result.jobId ?? "",
    });
}

/**
 * Guard exécuté avant chaque commande : bloque le joueur mort, en combat, en voyage ou en train de travailler.
 *
 * @returns `true` si la commande peut s'exécuter, `false` si l'interaction a déjà reçu une réponse de refus.
 */
export async function runGuard(
    interaction: ChatInputCommandInteraction,
    command: BotCommand,
): Promise<boolean> {
    const locale = resolveLocale(interaction.locale);

    const result = await checkPlayerState(
        interaction.client,
        playerIdOf(interaction.user.id),
    );
    if (result.ok) return true;

    // Exemption ciblée : attaquer ou fuir reste possible en combat, puisque c'est la seule façon d'en sortir.
    if (command.allowDuring?.(interaction).includes(result.state)) return true;

    const view = STATE_VIEW[result.state];
    await interaction.reply(
        reply(
            panel(
                `### ${withEmoji(view.emoji, t(locale, "guard.title"))}`,
                describeBlock(locale, result),
            ),
            { ephemeral: true },
        ),
    );
    return false;
}
