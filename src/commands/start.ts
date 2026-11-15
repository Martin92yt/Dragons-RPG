import {
    ActionRowBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    escapeMarkdown,
    type ButtonInteraction,
    type ChatInputCommandInteraction,
} from "discord.js";
import { emoji, emojiData, withEmoji } from "../core/emojis";
import { goldText } from "../core/format";
import { wrap } from "../core/text";
import { attachGuideMenu, guideView } from "../core/guide";
import { playerIdOf } from "../core/guard";
import { createCharacter } from "../core/onboarding";
import { edit, panel, reply } from "../core/ui";
import { contentDescription, contentName } from "../i18n/content";
import { describe, named, resolveLocale, t } from "../i18n";

/** Icône d'une classe selon sa statistique d'attaque. */
function classIcon(attackStat: string | undefined) {
    return attackStat === "agility" ? "classAttackAgility" : attackStat === "intelligence" ? "classAttackIntelligence" : "classAttackStrength";
}

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

    const classes = world.classes.list().slice(0, 25);
    const stat = (c: (typeof classes)[number], key: "strength" | "agility" | "intelligence" | "defense") =>
        `${emoji(key)} **${c.baseStats[key]}**`;

    // Les classes sont décrites dans le message (statistiques avec leurs emojis) : le menu ne garde que le nom.
    const classBlocks = classes.map((c) => {
        const description = contentDescription(locale, "class", c.id, c.description);
        return [
            `${emoji(classIcon(c.attackStat))} **${contentName(locale, "class", c.id, c.name)}**`,
            description ? wrap(description) : null,
            (["strength", "agility", "intelligence", "defense"] as const).map((key) => stat(c, key)).join("  •  "),
        ]
            .filter(Boolean)
            .join("\n");
    });

    const menu = new StringSelectMenuBuilder()
        .setCustomId("start:class")
        .setPlaceholder(t(locale, "start.classPlaceholder"))
        .addOptions(
            classes.map((c) => ({
                label: contentName(locale, "class", c.id, c.name).slice(0, 100),
                emoji: emojiData(classIcon(c.attackStat)),
                value: c.id,
            })),
        );

    const welcome = panel(
        `## ${withEmoji("character", t(locale, "start.welcomeTitle"))}`,
        wrap(t(locale, "start.welcomeBody")),
        ...classBlocks,
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
