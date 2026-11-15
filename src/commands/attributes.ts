import {
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SlashCommandBuilder,
    TextDisplayBuilder,
    type ChatInputCommandInteraction,
} from "discord.js";
import { emoji, withEmoji } from "../core/emojis";
import { attributeLabel } from "../core/format";
import { persist, requirePlayer, type Player } from "../core/player";
import { edit, panel, reply } from "../core/ui";
import { choice, describe, named, resolveLocale, t, type Locale } from "../i18n";

const ATTRIBUTES = ["strength", "agility", "intelligence", "defense"] as const;
type Attribute = (typeof ATTRIBUTES)[number];

export const data = describe(named(new SlashCommandBuilder(), "attributes", "attributs"), "attributes.desc")
    .addSubcommand((sub) => describe(named(sub, "view", "voir"), "attributes.view.desc"))
    .addSubcommand((sub) =>
        describe(named(sub, "upgrade", "améliorer"), "attributes.upgrade.desc")
            .addStringOption((o) =>
                describe(named(o, "attribute", "attribut"), "opt.attribute")
                    .setRequired(true)
                    .addChoices(...ATTRIBUTES.map((a) => choice(`attribute.${a}`, a))),
            )
            .addIntegerOption((o) =>
                describe(named(o, "amount", "quantité"), "opt.quantity").setMinValue(1).setMaxValue(50),
            ),
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const player = await requirePlayer(interaction);
    if (!player) return;

    if (interaction.options.getSubcommand() === "upgrade") {
        const attribute = interaction.options.getString("attribute", true) as Attribute;
        const wanted = interaction.options.getInteger("amount") ?? 1;
        const amount = Math.min(wanted, player.attributes.points);

        if (amount <= 0) {
            await interaction.reply(reply(panel(withEmoji("error", t(locale, "err.noPoints"))), { ephemeral: true }));
            return;
        }

        for (let spent = 0; spent < amount; spent++) player.levelUpSkill(attribute);
        await persist(interaction.client, player);

        await interaction.reply(
            reply(
                panel(
                    withEmoji(
                        attribute,
                        t(locale, "attributes.upgraded", {
                            attribute: attributeLabel(locale, attribute),
                            amount,
                            value: player.attributes[attribute],
                        }),
                    ),
                    t(locale, "attributes.remaining", { points: player.attributes.points }),
                ),
            ),
        );
        return;
    }

    const response = await interaction.reply({ ...reply(attributesView(locale, player), { ephemeral: true }), withResponse: true });
    const message = response.resource!.message!;

    // Boutons +1 : réservés à leur propriétaire, actifs 5 minutes après la dernière action.
    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, idle: 5 * 60_000 });
    collector.on("collect", async (pressed) => {
        if (pressed.user.id !== interaction.user.id) return void pressed.deferUpdate().catch(() => undefined);
        const attribute = pressed.customId.replace("attr:", "") as Attribute;
        if (!ATTRIBUTES.includes(attribute)) return;
        if (player.attributes.points > 0) {
            player.levelUpSkill(attribute);
            await persist(interaction.client, player);
        }
        await pressed.update(edit(attributesView(locale, player))).catch(() => undefined);
    });
    collector.on("end", () => {
        interaction.editReply(edit(attributesView(locale, player, true)) as never).catch(() => undefined);
    });
}

/** Vue des attributs : une ligne par attribut, avec son bouton +1 à droite tant qu'il reste des points. */
function attributesView(locale: Locale, player: Player, disabled = false): ContainerBuilder {
    const { attributes } = player;
    const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## ${emoji("skillPoints")} ${t(locale, "attributes.title")}\n${t(locale, "attributes.points", { points: attributes.points })}`,
        ),
    );
    for (const attribute of ATTRIBUTES) {
        container
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### ${emoji(attribute)} ${attributeLabel(locale, attribute)}\n**${attributes[attribute]}**`,
                        ),
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId(`attr:${attribute}`)
                            .setLabel("+1")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(disabled || attributes.points <= 0),
                    ),
            );
    }
    return container;
}
