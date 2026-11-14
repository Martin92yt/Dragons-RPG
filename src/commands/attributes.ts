import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { withEmoji } from "../core/emojis";
import { attributeLabel } from "../core/format";
import { persist, requirePlayer } from "../core/player";
import { panel, reply } from "../core/ui";
import { choice, describe, named, resolveLocale, t } from "../i18n";

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

    const { attributes } = player;
    await interaction.reply(
        reply(
            panel(
                `## ${withEmoji("skillPoints", t(locale, "attributes.title"))}`,
                ATTRIBUTES.map((a) => withEmoji(a, `**${attributeLabel(locale, a)}** : ${attributes[a]}`)).join("\n"),
                t(locale, "attributes.points", { points: attributes.points }),
            ),
        ),
    );
}
