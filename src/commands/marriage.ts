import {
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
} from "discord.js";
import { confirm } from "../core/confirm";
import { withEmoji } from "../core/emojis";
import { checkPlayerState, playerIdOf } from "../core/guard";
import { loadPlayer, persist, requirePlayer, requireTargetPlayer } from "../core/player";
import { edit, panel, reply, withButtons } from "../core/ui";
import { describe, named, resolveLocale, t } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "marriage", "mariage"), "marriage.desc")
    .addSubcommand((sub) =>
        describe(named(sub, "propose", "demander"), "marriage.propose.desc").addUserOption((o) =>
            describe(named(o, "user", "joueur"), "opt.user").setRequired(true),
        ),
    )
    .addSubcommand((sub) => describe(named(sub, "status", "statut"), "marriage.status.desc"))
    .addSubcommand((sub) => describe(named(sub, "divorce", "divorcer"), "marriage.divorce.desc"));

const mention = (userId: string) => `<@${userId}>`;
const userOf = (playerId: string) => playerId.slice(playerId.indexOf("_") + 1);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const player = await requirePlayer(interaction);
    if (!player) return;

    const fail = (key: Parameters<typeof t>[1]) =>
        interaction.reply(reply(panel(withEmoji("error", t(locale, key))), { ephemeral: true }));

    switch (interaction.options.getSubcommand()) {
        case "status": {
            const partner = player.marriage.getPartnerId();
            await interaction.reply(
                reply(
                    panel(
                        `## ${withEmoji("marriage", t(locale, "marriage.statusTitle"))}`,
                        partner
                            ? t(locale, "marriage.statusMarried", { partner: mention(userOf(partner)) })
                            : t(locale, "marriage.statusSingle"),
                    ),
                    { ephemeral: true },
                ),
            );
            return;
        }

        case "divorce": {
            const partnerId = player.marriage.getPartnerId();
            if (!partnerId) return void (await fail("marriage.notMarried"));
            const partnerMention = mention(userOf(partnerId));

            if (!(await confirm(interaction, locale, t(locale, "marriage.divorceConfirm", { partner: partnerMention })))) return;

            const partner = await interaction.client.RPG.players.get(partnerId);
            player.marriage.divorce();
            partner?.marriage.syncPartner("");
            await persist(interaction.client, player);
            if (partner) await persist(interaction.client, partner);
            await interaction.editReply(
                edit(panel(withEmoji("marriage", t(locale, "marriage.divorced", { partner: partnerMention })))) as never,
            );
            return;
        }

        case "propose": {
            const target = interaction.options.getUser("user", true);
            if (target.id === interaction.user.id) return void (await fail("marriage.self"));
            if (target.bot) return void (await fail("marriage.bot"));
            if (player.marriage.isMarried()) return void (await fail("marriage.alreadyMarried"));

            const other = await requireTargetPlayer(interaction, target.id);
            if (!other) return;
            if (other.marriage.isMarried()) return void (await fail("marriage.targetMarried"));

            const acceptId = `marry:yes:${interaction.id}`;
            const declineId = `marry:no:${interaction.id}`;
            const buttons = (disabled: boolean) => [
                new ButtonBuilder().setCustomId(acceptId).setLabel(t(locale, "marriage.accept")).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
                new ButtonBuilder().setCustomId(declineId).setLabel(t(locale, "marriage.decline")).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
            ];
            const text = t(locale, "marriage.proposal", { from: mention(interaction.user.id), to: mention(target.id) });

            await interaction.reply({
                ...reply(withButtons(panel(withEmoji("marriage", text)), ...buttons(false))),
                allowedMentions: { users: [target.id] },
            });
            const message = await interaction.fetchReply();

            try {
                const pressed = await message.awaitMessageComponent({
                    componentType: ComponentType.Button,
                    time: 60_000,
                    filter: (button) => button.user.id === target.id,
                });

                if (pressed.customId === declineId) {
                    await pressed.update(
                        edit(panel(t(locale, "marriage.declined", { from: mention(interaction.user.id), to: mention(target.id) }))),
                    );
                    return;
                }

                // État rechargé à l'acceptation : tout peut avoir changé pendant l'attente.
                const mine = await checkPlayerState(interaction.client, playerIdOf(interaction.user.id));
                const theirs = await checkPlayerState(interaction.client, playerIdOf(target.id));
                const fresh = await loadPlayer(interaction.client, interaction.user.id);
                const freshOther = await loadPlayer(interaction.client, target.id);
                if (!fresh || !freshOther || !mine.ok || !theirs.ok) {
                    await pressed.update(edit(panel(withEmoji("error", t(locale, "marriage.targetBusy")))));
                    return;
                }
                if (fresh.marriage.isMarried() || freshOther.marriage.isMarried()) {
                    await pressed.update(edit(panel(withEmoji("error", t(locale, "marriage.targetMarried")))));
                    return;
                }

                fresh.marriage.setPartner(freshOther.id);
                freshOther.marriage.setPartner(fresh.id);
                await persist(interaction.client, fresh);
                await persist(interaction.client, freshOther);
                await pressed.update(
                    edit(
                        panel(
                            withEmoji(
                                "marriage",
                                t(locale, "marriage.married", { a: mention(interaction.user.id), b: mention(target.id) }),
                            ),
                        ),
                    ),
                );
            } catch {
                await interaction.editReply(edit(panel(t(locale, "marriage.expired"))) as never).catch(() => undefined);
            }
        }
    }
}
