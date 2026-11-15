import { log } from "../core/logger";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
    type AttachmentBuilder,
    type ChatInputCommandInteraction,
    type ContainerBuilder,
    type Message,
} from "discord.js";
import type EnemyEntity from "dragons-of-legends.js/dist/enemy/enemy.js";
import { withEmoji } from "../core/emojis";
import { captureEvents, eventsNamed } from "../core/events";
import { goldText, itemDescription, itemName, num, tierLabel } from "../core/format";
import { persist, requirePlayer, type Player } from "../core/player";
import { bar, edit, imageGallery, panel, reply } from "../core/ui";
import { COMBAT_CARD_NAME, renderCombatCard } from "../canvas/combat-card";
import { enemyGlyph } from "../canvas/glyphs";
import { contentName } from "../i18n/content";
import { describe, formatIn, named, resolveLocale, t, type Locale } from "../i18n";

type Client = ChatInputCommandInteraction["client"];

export const data = describe(named(new SlashCommandBuilder(), "combat"), "combat.desc");

/** Quand un combat est en cours, `/combat` ne fait que le reprendre : c'est aussi la sortie de l'état de combat. */
export function allowDuring(): readonly "combat"[] {
    return ["combat"];
}

/** Objets utilisables par combat : au-delà, impossible de transformer un combat en simple stock de potions. */
const MAX_ITEM_USES = 3;
const uses = new Map<string, number>();

export function enemyName(locale: Locale, enemy: Pick<EnemyEntity, "type" | "name">): string {
    return contentName(locale, "enemy", enemy.type, enemy.name);
}

/** Fiche d'un ennemi : nom, palier, barre de vie et statistiques. */
export function enemySheet(locale: Locale, enemy: EnemyEntity): string {
    return [
        `**${enemyName(locale, enemy)}** • ${tierLabel(locale, enemy.tier)}`,
        `${bar(enemy.health, enemy.maxHealth, 12)} ${t(locale, "combat.enemyStats", {
            health: num(locale, enemy.health),
            max: num(locale, enemy.maxHealth),
            strength: enemy.strength,
            defense: enemy.defense,
        })}`,
    ].join("\n");
}

function playerLine(locale: Locale, player: Player): string {
    return withEmoji(
        "health",
        `**${t(locale, "combat.you")}** : ${bar(player.health.current, player.health.max, 12)} ${num(locale, player.health.current)}/${num(locale, player.health.max)}`,
    );
}

/** Consommables que le joueur peut utiliser en combat (soins et effets, pas les pochettes). */
async function usableItems(client: Client, player: Player) {
    const world = client.RPG;
    const records = await player.inventory.getItems();
    const byId = new Map<string, number>();
    for (const record of records) {
        const use = world.items.get(record.itemId)?.use;
        if (use && !use.lootbox) byId.set(record.itemId, (byId.get(record.itemId) ?? 0) + record.quantity);
    }
    return [...byId].slice(0, 25).flatMap(([itemId, quantity]) => {
        const item = world.items.get(itemId);
        return item ? [{ item, quantity }] : [];
    });
}

interface LiveView {
    readonly container: ContainerBuilder;
    readonly files: AttachmentBuilder[];
}

interface ViewOptions {
    readonly log?: readonly string[];
    /** Blocs affichés avant la fiche (ex. arrivée d'un voyage interrompu par une embuscade). */
    readonly header?: readonly string[];
    readonly disabled?: boolean;
}

/** Interface de combat : fiche, journal du dernier échange, bouton Attaquer / Fuir et menu « Utiliser ». */
async function liveView(
    client: Client,
    locale: Locale,
    player: Player,
    enemy: EnemyEntity,
    options: ViewOptions = {},
): Promise<LiveView> {
    const disabled = options.disabled ?? false;
    // Les barres de vie sont dessinées sur une image (canvas) ; le texte ne garde que les infos utiles.
    const card = await renderCombatCard(
        { name: enemyName(locale, enemy), current: enemy.health, max: enemy.maxHealth, tag: tierLabel(locale, enemy.tier), icon: enemyGlyph(enemy.type, enemy.tier) },
        { name: player.name, current: player.health.current, max: player.health.max, tag: `${t(locale, "common.levelShort")} ${player.level}`, icon: "character" },
    );
    const container = panel(
        ...(options.header ?? []),
    );
    container.addMediaGalleryComponents(
        imageGallery(COMBAT_CARD_NAME, `${enemyName(locale, enemy)} ${Math.round(enemy.health)}/${Math.round(enemy.maxHealth)}`),
    );
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            [
                t(locale, "combat.enemyStats", {
                    health: num(locale, enemy.health),
                    max: num(locale, enemy.maxHealth),
                    strength: enemy.strength,
                    defense: enemy.defense,
                }),
                options.log && options.log.length > 0 ? `**${t(locale, "combat.round")}**\n${options.log.join("\n")}` : null,
            ]
                .filter(Boolean)
                .join("\n"),
        ),
    );

    container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("cb:attack").setLabel(t(locale, "combat.attackButton")).setStyle(ButtonStyle.Primary).setDisabled(disabled),
            new ButtonBuilder().setCustomId("cb:flee").setLabel(t(locale, "combat.fleeButton")).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        ),
    );

    const left = MAX_ITEM_USES - (uses.get(player.id) ?? 0);
    const items = await usableItems(client, player);
    if (items.length > 0 && left > 0) {
        container.addActionRowComponents(
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("cb:use")
                    .setPlaceholder(t(locale, "combat.usePlaceholder", { left }))
                    .setDisabled(disabled)
                    .addOptions(
                        items.map(({ item, quantity }) => ({
                            label: `${itemName(locale, item)} ×${quantity}`.slice(0, 100),
                            description: (itemDescription(locale, item) ?? "").slice(0, 100) || undefined,
                            value: item.itemId,
                        })),
                    ),
            ),
        );
    }
    return { container, files: [card] };
}

const liveEdit = async (client: Client, locale: Locale, player: Player, enemy: EnemyEntity, options: ViewOptions = {}) => {
    const { container, files } = await liveView(client, locale, player, enemy, options);
    return edit(container, files);
};

/** Écran de fin (victoire, défaite ou fuite) : plus aucun composant. */
function endView(locale: Locale, ...blocks: Array<string | null>): ContainerBuilder {
    return panel(...blocks);
}

/**
 * Branche les boutons et le menu d'un message de combat.
 * Le collecteur est propre au message : seul le joueur concerné peut agir, et il s'éteint à la fin du combat
 * ou après 10 minutes d'inactivité (le combat reste alors en cours et `/combat` le reprend).
 */
export function attachCombatControls(message: Message, client: Client, player: Player, locale: Locale): void {
    const world = client.RPG;
    const collector = message.createMessageComponentCollector({ idle: 10 * 60_000 });
    const userId = player.id;

    collector.on("collect", async (pressed) => {
        if (pressed.user.id !== userId) {
            await pressed
                .reply(reply(panel(withEmoji("error", t(resolveLocale(pressed.locale), "combat.notYours"))), { ephemeral: true }))
                .catch(() => undefined);
            return;
        }

        try {
            const combat = world.combat.get(player.id);
            if (!combat) {
                await pressed.update(edit(endView(locale, withEmoji("error", t(locale, "combat.over")))));
                collector.stop("done");
                return;
            }
            const enemy = combat.enemyEntity;
            const name = enemyName(locale, enemy);

            if (pressed.isButton() && pressed.customId === "cb:flee") {
                world.combat.clear(player.id);
                uses.delete(player.id);
                await persist(client, player);
                await pressed.update(edit(endView(locale, withEmoji("flee", t(locale, "combat.fled", { enemy: name })), playerLine(locale, player))));
                collector.stop("done");
                return;
            }

            if (pressed.isStringSelectMenu() && pressed.customId === "cb:use") {
                const used = uses.get(player.id) ?? 0;
                if (used >= MAX_ITEM_USES) {
                    await pressed.reply(reply(panel(withEmoji("error", t(locale, "combat.useLimit", { max: MAX_ITEM_USES }))), { ephemeral: true }));
                    return;
                }
                const itemId = pressed.values[0]!;
                const item = world.items.get(itemId);
                const { result: ok, events } = await captureEvents(world, player.id, () => player.inventory.use(itemId));
                if (!ok || !item) {
                    await pressed.reply(reply(panel(withEmoji("error", t(locale, "combat.useFailed"))), { ephemeral: true }));
                    return;
                }
                uses.set(player.id, used + 1);
                await persist(client, player);

                const usage = eventsNamed(events, "itemUse")[0];
                const log = [
                    withEmoji("effect", t(locale, "combat.used", { item: itemName(locale, item) })),
                    usage && usage.healed > 0 ? t(locale, "combat.healed", { amount: num(locale, usage.healed) }) : null,
                    ...(usage?.effects ?? []).map((id) =>
                        t(locale, "combat.effectGained", {
                            effect: contentName(locale, "effect", id, world.effects.get(id)?.name ?? id),
                        }),
                    ),
                ].filter((line): line is string => line !== null);
                await pressed.update(await liveEdit(client, locale, player, enemy, { log }));
                return;
            }

            // Attaque : le détail des gains et de la mort n'existe que dans les événements.
            const { result, events } = await captureEvents(world, player.id, () => world.combat.attack(player.id));
            await persist(client, player);

            const log = [
                result.playerDamage > 0
                    ? withEmoji("attack", t(locale, "combat.dealt", { damage: num(locale, result.playerDamage), enemy: name }))
                    : null,
                result.enemyDamage > 0
                    ? t(locale, "combat.received", { damage: num(locale, result.enemyDamage), enemy: name })
                    : null,
            ].filter((line): line is string => line !== null);

            if (result.victory) {
                uses.delete(player.id);
                const defeat = eventsNamed(events, "enemyDefeat")[0];
                const levelUp = eventsNamed(events, "playerLevelUp")[0];
                const loot = result.enemy.droppedLootList.map((drop) => `• **${drop.quantity}x** ${itemName(locale, drop.loot)}`);
                await pressed.update(
                    edit(
                        endView(
                            locale,
                            `## ${withEmoji("victory", t(locale, "combat.victory", { enemy: name }))}`,
                            log.join("\n"),
                            t(locale, "combat.gains", {
                                xp: num(locale, eventsNamed(events, "playerExperienceGain")[0]?.amount ?? defeat?.experience ?? 0),
                                gold: goldText(locale, defeat?.gold ?? result.enemy.gold),
                            }),
                            levelUp ? withEmoji("level", t(locale, "combat.levelUp", { level: levelUp.level, points: levelUp.attributePoints })) : null,
                            loot.length > 0 ? `**${t(locale, "combat.loot")}**\n${loot.join("\n")}` : null,
                            playerLine(locale, player),
                        ),
                    ),
                );
                collector.stop("done");
                return;
            }

            if (result.defeat) {
                uses.delete(player.id);
                const death = eventsNamed(events, "playerDeath")[0];
                const lost =
                    death && ((death.lostGold ?? 0) > 0 || (death.lostItems?.length ?? 0) > 0)
                        ? t(locale, "combat.lost", {
                              gold: goldText(locale, death.lostGold ?? 0),
                              items: death.lostItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
                          })
                        : null;
                const respawn = death?.respawnAt
                    ? t(locale, "combat.respawn", { time: formatIn(locale, death.respawnAt - Date.now()) })
                    : t(locale, "combat.permanentDeath");
                await pressed.update(
                    edit(
                        endView(
                            locale,
                            `## ${withEmoji("defeat", t(locale, "combat.defeat", { enemy: name }))}`,
                            log.join("\n"),
                            lost,
                            withEmoji("dead", respawn),
                        ),
                    ),
                );
                collector.stop("done");
                return;
            }

            await pressed.update(await liveEdit(client, locale, player, result.enemy, { log }));
        } catch (error) {
            log.combat.error(error);
            await pressed.reply(reply(panel(withEmoji("error", t(locale, "error.generic"))), { ephemeral: true })).catch(() => undefined);
        }
    });

    collector.on("end", async (_collected, reason) => {
        if (reason === "done") return;
        const enemy = world.combat.get(player.id)?.enemyEntity;
        if (!enemy) return;
        const payload = await liveEdit(client, locale, player, enemy, { disabled: true, log: [t(locale, "combat.timeout")] });
        await message.edit(payload as never).catch(() => undefined);
    });
}

/** Vue de combat prête à l'emploi pour les autres commandes (voyage interrompu par une embuscade). */
export async function ambushEdit(
    client: Client,
    locale: Locale,
    player: Player,
    enemy: EnemyEntity,
    header: readonly string[],
) {
    return liveEdit(client, locale, player, enemy, { header });
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    const existing = world.combat.get(player.id);
    const combat = existing ?? world.combat.start(player);
    const enemy = combat.enemyEntity;
    const key = existing ? "combat.resumed" : "combat.started";
    const header = withEmoji(
        "enemy",
        t(locale, key, { enemy: enemyName(locale, enemy), tier: tierLabel(locale, enemy.tier) }),
    );

    const { container, files } = await liveView(interaction.client, locale, player, enemy, { header: [header] });
    const message = await interaction
        .reply({ ...reply(container, { files }), withResponse: true })
        .then((response) => response.resource!.message!);
    attachCombatControls(message, interaction.client, player, locale);
}
