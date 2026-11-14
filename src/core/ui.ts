import {
    ActionRowBuilder,
    ContainerBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    type ButtonBuilder,
} from "discord.js";

/** Limite d'un bloc de texte Components V2 (le total d'un message est limité à 4000 caractères). */
const MAX_BLOCK = 3900;

export function clip(text: string, max = MAX_BLOCK): string {
    return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Container monochrome strict : aucune couleur d'accent, texte uniquement. */
export function panel(...blocks: Array<string | null | undefined | false>): ContainerBuilder {
    const container = new ContainerBuilder();
    const filled = blocks.filter((b): b is string => typeof b === "string" && b.length > 0);
    filled.forEach((text, index) => {
        if (index > 0) {
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
            );
        }
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(clip(text)));
    });
    return container;
}

/** Ajoute une rangée de boutons au bas d'un container. */
export function withButtons(container: ContainerBuilder, ...buttons: ButtonBuilder[]): ContainerBuilder {
    if (buttons.length > 0) {
        container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons));
    }
    return container;
}

/** Options de réponse Components V2 standard du bot (`interaction.reply`). */
export function reply(container: ContainerBuilder, options: { ephemeral?: boolean } = {}) {
    return {
        components: [container],
        flags: options.ephemeral
            ? ([MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] as const)
            : ([MessageFlags.IsComponentsV2] as const),
    };
}

/** Options de modification Components V2 (`editReply`, `update`) : l'éphémère se garde du message d'origine. */
export function edit(container: ContainerBuilder) {
    return {
        components: [container],
        flags: [MessageFlags.IsComponentsV2] as const,
    };
}

/** Barre de progression en blocs pleins/vides, lisible en monochrome. */
export function bar(current: number, max: number, length = 10): string {
    const ratio = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;
    const filled = Math.round(ratio * length);
    return `${"█".repeat(filled)}${"░".repeat(length - filled)}`;
}
