import {
    ContainerBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    type APIMessageTopLevelComponent,
    type InteractionReplyOptions,
} from "discord.js";
import { BOT } from "../bot.config";

/** Container monochrome : accent blanc, texte uniquement, aucune couleur vive. */
export function panel(...blocks: Array<string | null | undefined | false>): ContainerBuilder {
    const container = new ContainerBuilder();
    const filled = blocks.filter((b): b is string => typeof b === "string" && b.length > 0);
    filled.forEach((text, index) => {
        if (index > 0) {
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
            );
        }
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    });
    return container;
}

/** Options de réponse Components V2 standard du bot. */
export function reply(
    container: ContainerBuilder,
    options: { ephemeral?: boolean } = {},
): InteractionReplyOptions & { flags: number } {
    return {
        flags: MessageFlags.IsComponentsV2 | (options.ephemeral ? MessageFlags.Ephemeral : 0),
        components: [container as unknown as APIMessageTopLevelComponent],
    } as InteractionReplyOptions & { flags: number };
}
