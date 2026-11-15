import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    type ContainerBuilder,
    type Message,
} from "discord.js";
import { edit, panel, reply } from "./ui";
import { emojiData, withEmoji } from "./emojis";
import { wrap } from "./text";
import { t, type Locale, type MessageKey } from "../i18n";


export const GUIDE_TOPICS = ["basics", "combat", "travel", "jobs", "economy", "social"] as const;
export type GuideTopic = (typeof GUIDE_TOPICS)[number];

/** Icône de chaque sujet, affichée dans le menu. */
const TOPIC_ICONS: Record<GuideTopic, Parameters<typeof emojiData>[0]> = {
    basics: "info",
    combat: "combat",
    travel: "travel",
    jobs: "jobs",
    economy: "bank",
    social: "title",
};

/** Page du guide : titre, texte du sujet et menu pour changer de sujet. */
export function guideView(locale: Locale, topic: GuideTopic, ...before: string[]): ContainerBuilder {
    const container = panel(
        ...before,
        `## ${t(locale, "guide.title")} — ${t(locale, `guide.topic.${topic}` as MessageKey)}`,
        // Les textes sont écrits avec des sauts de ligne ; `wrap` rattrape les lignes trop longues (mentions comprises).
        wrap(t(locale, `guide.body.${topic}` as MessageKey)),
    );
    container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("guide:topic")
                .setPlaceholder(t(locale, "guide.placeholder"))
                .addOptions(
                    GUIDE_TOPICS.map((value) => ({
                        label: t(locale, `guide.topic.${value}` as MessageKey),
                        emoji: emojiData(TOPIC_ICONS[value]),
                        value,
                        default: value === topic,
                    })),
                ),
        ),
    );
    return container;
}

/** Fait vivre le menu de sujets d'un message de guide (réservé à `userId`, 5 minutes d'inactivité). */
export function attachGuideMenu(message: Message, userId: string, locale: Locale): void {
    const collector = message.createMessageComponentCollector({ idle: 5 * 60_000 });
    collector.on("collect", async (pressed) => {
        if (!pressed.isStringSelectMenu() || pressed.customId !== "guide:topic") return;
        if (pressed.user.id !== userId) {
            await pressed
                .reply(reply(panel(withEmoji("error", t(locale, "start.notYours"))), { ephemeral: true }))
                .catch(() => undefined);
            return;
        }
        const topic = (GUIDE_TOPICS as readonly string[]).includes(pressed.values[0]!) ? (pressed.values[0] as GuideTopic) : "basics";
        await pressed.update(edit(guideView(locale, topic))).catch(() => undefined);
    });
}
