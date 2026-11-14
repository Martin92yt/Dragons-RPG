import {
    ActionRowBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    escapeMarkdown,
    type ButtonInteraction,
    type ChatInputCommandInteraction,
} from "discord.js";
import { withEmoji } from "../core/emojis";
import { attributeLabel, goldText } from "../core/format";
import { attachGuideMenu, guideView } from "../core/guide";
import { playerIdOf } from "../core/guard";
import { createCharacter } from "../core/onboarding";
import { edit, panel, reply } from "../core/ui";
import { contentDescription, contentName } from "../i18n/content";
import { describe, named, resolveLocale, t } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "start", "démarrer"), "start.desc");

/** Accessible à tout moment, même en combat : on ne crée un personnage que s'il n'en existe pas. */
export const bypassGuard = true;

/**
 * Parcours d'accueil : choix de la classe dans un menu, création du personnage, puis guide.
 * Appelé par `/start` et par le bouton du message de bienvenue envoyé quand le bot rejoint un serveur.
 */
export async function showStart(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const client = interaction.client;
    const world = client.RPG;
    const userId = interaction.user.id;

    if (await world.players.exist(playerIdOf(userId))) {
        const response = await interaction.reply({
            ...reply(guideView(locale, "basics", withEmoji("success", t(locale, "start.already"))), { ephemeral: true }),
            withResponse: true,
        });
        attachGuideMenu(response.resource!.message!, userId, locale);
        return;
    }

    const classes = world.classes.list();
    const menu = new StringSelectMenuBuilder()
        .setCustomId("start:class")
        .setPlaceholder(t(locale, "start.classPlaceholder"))
        .addOptions(
            classes.slice(0, 25).map((c) => {
                const stats = (["strength", "agility", "intelligence", "defense"] as const)
                    .map((stat) => `${attributeLabel(locale, stat)} ${c.baseStats[stat]}`)
                    .join(" • ");
                const description = contentDescription(locale, "class", c.id, c.description);
                return {
                    label: contentName(locale, "class", c.id, c.name).slice(0, 100),
                    description: (description ? `${description} — ${stats}` : stats).slice(0, 100),
                    value: c.id,
                };
            }),
        );

    const welcome = panel(
        `## ${withEmoji("character", t(locale, "start.welcomeTitle"))}`,
        t(locale, "start.welcomeBody"),
        t(locale, "start.pickClass"),
    );
    welcome.addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu));

    const response = await interaction.reply({ ...reply(welcome, { ephemeral: true }), withResponse: true });
    const message = response.resource!.message!;

    try {
        const picked = await message.awaitMessageComponent({
            filter: (component) => component.user.id === userId && component.customId === "start:class",
            time: 5 * 60_000,
        });
        if (!picked.isStringSelectMenu()) return;

        const classId = picked.values[0]!;
        const playerClass = world.classes.get(classId);
        if (!playerClass || (await world.players.exist(playerIdOf(userId)))) {
            await picked.update(edit(panel(withEmoji("error", t(locale, "err.unknownClass")))));
            return;
        }

        const player = await createCharacter(client, userId, interaction.user.displayName, classId);
        await picked.update(
            edit(
                guideView(
                    locale,
                    "basics",
                    `## ${withEmoji("success", t(locale, "start.created", { name: escapeMarkdown(player.name), class: contentName(locale, "class", playerClass.id, playerClass.name) }))}`,
                    t(locale, "start.gift", { gold: goldText(locale, player.gold) }),
                    t(locale, "start.next"),
                ),
            ),
        );
        attachGuideMenu(message, userId, locale);
    } catch {
        await interaction.editReply(edit(panel(t(locale, "start.timeout"))) as never).catch(() => undefined);
    }
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await showStart(interaction);
}
