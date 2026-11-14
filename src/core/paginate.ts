import {
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags,
    type ChatInputCommandInteraction,
} from "discord.js";
import { edit, panel, reply, withButtons } from "./ui";
import { t, type Locale } from "../i18n";

export interface PagedOptions {
    readonly title: string;
    readonly lines: readonly string[];
    /** Texte affiché sous le titre, sur toutes les pages. */
    readonly intro?: string;
    readonly perPage?: number;
    readonly ephemeral?: boolean;
    /** Texte si la liste est vide. */
    readonly emptyText?: string;
}

/** Budget de caractères par page, sous la limite de 4000 caractères d'un message Components V2. */
const PAGE_BUDGET = 3000;

function chunk(lines: readonly string[], perPage: number): string[][] {
    const pages: string[][] = [];
    let current: string[] = [];
    let size = 0;
    for (const line of lines) {
        if (current.length > 0 && (current.length >= perPage || size + line.length > PAGE_BUDGET)) {
            pages.push(current);
            current = [];
            size = 0;
        }
        current.push(line);
        size += line.length + 1;
    }
    if (current.length > 0) pages.push(current);
    return pages;
}

/**
 * Affiche une liste sur plusieurs pages avec des boutons Précédent / Suivant, réservés à l'auteur de la commande.
 * Retourne quand la collecte se termine (2 minutes sans interaction).
 */
export async function sendPaged(
    interaction: ChatInputCommandInteraction,
    locale: Locale,
    options: PagedOptions,
): Promise<void> {
    const pages = chunk(options.lines, options.perPage ?? 10);
    if (pages.length === 0) pages.push([options.emptyText ?? t(locale, "common.empty")]);

    const previousId = `page:prev:${interaction.id}`;
    const nextId = `page:next:${interaction.id}`;
    let index = 0;

    const render = (disabled = false) => {
        const container = panel(
            `## ${options.title}`,
            options.intro,
            (pages[index] ?? []).join("\n"),
            pages.length > 1 ? `-# ${t(locale, "common.page", { page: index + 1, total: pages.length })}` : null,
        );
        if (pages.length > 1) {
            withButtons(
                container,
                new ButtonBuilder()
                    .setCustomId(previousId)
                    .setLabel(t(locale, "common.previous"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled || index === 0),
                new ButtonBuilder()
                    .setCustomId(nextId)
                    .setLabel(t(locale, "common.next"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled || index === pages.length - 1),
            );
        }
        return container;
    };

    await interaction.reply(reply(render(), { ephemeral: options.ephemeral }));
    if (pages.length === 1) return;

    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000,
        filter: (button) => button.customId === previousId || button.customId === nextId,
    });

    collector.on("collect", async (button) => {
        if (button.user.id !== interaction.user.id) {
            await button.reply({ content: t(locale, "error.notYours"), flags: MessageFlags.Ephemeral }).catch(() => undefined);
            return;
        }
        index = button.customId === nextId ? Math.min(pages.length - 1, index + 1) : Math.max(0, index - 1);
        await button.update(edit(render())).catch(() => undefined);
    });

    await new Promise<void>((resolve) => {
        collector.on("end", async () => {
            await interaction.editReply(edit(render(true))).catch(() => undefined);
            resolve();
        });
    });
}
