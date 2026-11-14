import {
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    type ChatInputCommandInteraction,
} from "discord.js";
import { edit, panel, reply, withButtons } from "./ui";
import { t, type Locale } from "../i18n";

/**
 * Demande une confirmation (message éphémère avec Confirmer / Annuler).
 *
 * - `true` : confirmé. L'interaction est alors différée et le message de confirmation est toujours à l'écran :
 *   l'appelant doit le remplacer avec `interaction.editReply(...)`.
 * - `false` : annulé ou expiré. Le message est déjà mis à jour, l'appelant n'a plus rien à faire.
 */
export async function confirm(
    interaction: ChatInputCommandInteraction,
    locale: Locale,
    question: string,
): Promise<boolean> {
    const confirmId = `confirm:yes:${interaction.id}`;
    const cancelId = `confirm:no:${interaction.id}`;

    const buttons = (disabled: boolean) => [
        new ButtonBuilder()
            .setCustomId(confirmId)
            .setLabel(t(locale, "common.confirm"))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(cancelId)
            .setLabel(t(locale, "common.cancel"))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
    ];

    await interaction.reply(reply(withButtons(panel(question), ...buttons(false)), { ephemeral: true }));
    const message = await interaction.fetchReply();

    try {
        const pressed = await message.awaitMessageComponent({
            componentType: ComponentType.Button,
            time: 30_000,
            filter: (button) => button.user.id === interaction.user.id,
        });

        if (pressed.customId === confirmId) {
            await pressed.deferUpdate();
            return true;
        }

        await pressed.update(edit(panel(t(locale, "common.cancelled"))));
        return false;
    } catch {
        await interaction.editReply(edit(panel(t(locale, "common.timeout")))).catch(() => undefined);
        return false;
    }
}
