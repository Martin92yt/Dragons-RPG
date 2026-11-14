import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type EnemyEntity from "dragons-of-legends.js/dist/enemy/enemy.js";
import { withEmoji } from "../core/emojis";
import { captureEvents, eventsNamed } from "../core/events";
import { goldText, itemName, num, tierLabel } from "../core/format";
import { persist, requirePlayer, type Player } from "../core/player";
import { bar, panel, reply } from "../core/ui";
import { contentName } from "../i18n/content";
import { describe, formatIn, named, resolveLocale, t, type Locale } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "combat"), "combat.desc")
    .addSubcommand((sub) => describe(named(sub, "start", "commencer"), "combat.start.desc"))
    .addSubcommand((sub) => describe(named(sub, "attack", "attaquer"), "combat.attack.desc"))
    .addSubcommand((sub) => describe(named(sub, "flee", "fuir"), "combat.flee.desc"))
    .addSubcommand((sub) => describe(named(sub, "status", "statut"), "combat.status.desc"));

/**
 * Seule exemption au guard : pendant un combat, attaquer, fuir et consulter l'état restent possibles,
 * puisque c'est la seule façon d'en sortir. Tout le reste (dont `/combat start`) reste bloqué.
 */
export function allowDuring(interaction: ChatInputCommandInteraction): readonly "combat"[] {
    const sub = interaction.options.getSubcommand(false);
    return sub === "attack" || sub === "flee" || sub === "status" ? ["combat"] : [];
}

export function enemyName(locale: Locale, enemy: Pick<EnemyEntity, "type" | "name">): string {
    return contentName(locale, "enemy", enemy.type, enemy.name);
}

/** Fiche d'un ennemi : nom, palier, barre de vie et statistiques. */
export function enemySheet(locale: Locale, enemy: EnemyEntity): string[] {
    return [
        `**${enemyName(locale, enemy)}** • ${tierLabel(locale, enemy.tier)}`,
        `${bar(enemy.health, enemy.maxHealth, 12)} ${t(locale, "combat.enemyStats", {
            health: num(locale, enemy.health),
            max: num(locale, enemy.maxHealth),
            strength: enemy.strength,
            defense: enemy.defense,
        })}`,
    ];
}

function playerLine(locale: Locale, player: Player): string {
    return withEmoji(
        "health",
        `**${t(locale, "combat.you")}** : ${bar(player.health.current, player.health.max, 12)} ${num(locale, player.health.current)}/${num(locale, player.health.max)}`,
    );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    switch (interaction.options.getSubcommand()) {
        case "start": {
            const combat = world.combat.start(player);
            const enemy = combat.enemyEntity;
            await interaction.reply(
                reply(
                    panel(
                        withEmoji(
                            "enemy",
                            t(locale, "combat.started", { enemy: enemyName(locale, enemy), tier: tierLabel(locale, enemy.tier) }),
                        ),
                        enemySheet(locale, enemy).join("\n"),
                        playerLine(locale, player),
                    ),
                ),
            );
            return;
        }

        case "status": {
            const combat = world.combat.get(player.id);
            if (!combat) {
                await interaction.reply(
                    reply(panel(withEmoji("error", t(locale, "err.notInCombat"))), { ephemeral: true }),
                );
                return;
            }
            await interaction.reply(
                reply(
                    panel(
                        `## ${withEmoji("combat", t(locale, "combat.statusTitle"))}`,
                        enemySheet(locale, combat.enemyEntity).join("\n"),
                        playerLine(locale, player),
                    ),
                ),
            );
            return;
        }

        case "flee": {
            const enemy = world.combat.get(player.id)?.enemyEntity;
            if (!enemy || !world.combat.clear(player.id)) {
                await interaction.reply(
                    reply(panel(withEmoji("error", t(locale, "err.notInCombat"))), { ephemeral: true }),
                );
                return;
            }
            await persist(interaction.client, player);
            await interaction.reply(
                reply(panel(withEmoji("flee", t(locale, "combat.fled", { enemy: enemyName(locale, enemy) })))),
            );
            return;
        }

        case "attack": {
            // Le détail des gains (XP, niveau, or) et de la mort n'existe que dans les événements.
            const { result, events } = await captureEvents(world, player.id, () => world.combat.attack(player.id));
            await persist(interaction.client, player);

            const enemy = result.enemy;
            const name = enemyName(locale, enemy);
            const blocks: string[] = [
                result.playerDamage > 0
                    ? withEmoji("attack", t(locale, "combat.dealt", { damage: num(locale, result.playerDamage), enemy: name }))
                    : "",
                result.enemyDamage > 0
                    ? t(locale, "combat.received", { damage: num(locale, result.enemyDamage), enemy: name })
                    : "",
            ].filter(Boolean);

            if (result.victory) {
                const defeat = eventsNamed(events, "enemyDefeat")[0];
                const levelUp = eventsNamed(events, "playerLevelUp")[0];
                const loot = enemy.droppedLootList.map((drop) => `• **${drop.quantity}x** ${itemName(locale, drop.loot)}`);

                await interaction.reply(
                    reply(
                        panel(
                            `## ${withEmoji("victory", t(locale, "combat.victory", { enemy: name }))}`,
                            blocks.join("\n"),
                            t(locale, "combat.gains", {
                                xp: num(locale, eventsNamed(events, "playerExperienceGain")[0]?.amount ?? defeat?.experience ?? 0),
                                gold: goldText(locale, defeat?.gold ?? enemy.gold),
                            }),
                            levelUp
                                ? withEmoji(
                                      "level",
                                      t(locale, "combat.levelUp", { level: levelUp.level, points: levelUp.attributePoints }),
                                  )
                                : null,
                            loot.length > 0 ? `**${t(locale, "combat.loot")}**\n${loot.join("\n")}` : null,
                            playerLine(locale, player),
                        ),
                    ),
                );
                return;
            }

            if (result.defeat) {
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

                await interaction.reply(
                    reply(
                        panel(
                            `## ${withEmoji("defeat", t(locale, "combat.defeat", { enemy: name }))}`,
                            blocks.join("\n"),
                            lost,
                            withEmoji("dead", respawn),
                        ),
                    ),
                );
                return;
            }

            await interaction.reply(
                reply(
                    panel(
                        blocks.join("\n"),
                        enemySheet(locale, enemy).join("\n"),
                        playerLine(locale, player),
                    ),
                ),
            );
            return;
        }
    }
}
