import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { LocationFlags } from "dragons-of-legends.js";
import { suggest } from "../core/autocomplete";
import { withEmoji } from "../core/emojis";
import { locationName, num, tierLabel } from "../core/format";
import { loadPlayer, persist, requirePlayer } from "../core/player";
import { sendPaged } from "../core/paginate";
import { edit, panel, reply } from "../core/ui";
import { describe, formatDuration, named, resolveLocale, t, type Locale } from "../i18n";
import { enemyName, enemySheet } from "./combat";

interface Route {
    readonly id: string;
    readonly mode: "land" | "boat";
    readonly distance: number;
    readonly danger: number;
}

interface MapLocation {
    readonly locationId: string;
    readonly locationFlags: number;
    readonly travelConnections: {
        readonly landRoutes: readonly { destinationLocationId: string; travelDistance: number; dangerLevel: number }[];
        readonly boatRoutes: readonly { destinationLocationId: string; travelDistance: number; dangerLevel: number }[];
    };
}

type World = ChatInputCommandInteraction["client"]["RPG"];

/** La librairie n'expose pas l'énumération des lieux : on passe par la sérialisation de la carte. */
function readMap(world: World): MapLocation[] {
    return JSON.parse(world.location.serialize()) as MapLocation[];
}

function routesFrom(world: World, locationId: string): Route[] {
    const here = readMap(world).find((place) => place.locationId === locationId);
    if (!here) return [];
    const flags = (id: string) => readMap(world).find((place) => place.locationId === id)?.locationFlags ?? 0;
    const convert = (mode: Route["mode"], list: MapLocation["travelConnections"]["landRoutes"]): Route[] =>
        list
            .filter((route) => (flags(route.destinationLocationId) & LocationFlags.TeleportOnly) === 0)
            .map((route) => ({
                id: route.destinationLocationId,
                mode,
                distance: route.travelDistance,
                danger: route.dangerLevel,
            }));
    return [...convert("land", here.travelConnections.landRoutes), ...convert("boat", here.travelConnections.boatRoutes)];
}

function flagsText(locale: Locale, flags: number): string {
    return [
        flags & LocationFlags.StarterCity ? t(locale, "travel.flag.start") : null,
        flags & LocationFlags.OnWater ? t(locale, "travel.flag.water") : null,
        flags & LocationFlags.TeleportOnly ? t(locale, "travel.flag.teleport") : null,
    ]
        .filter(Boolean)
        .join(", ");
}

export const data = describe(named(new SlashCommandBuilder(), "travel", "voyage"), "travel.desc")
    .addSubcommand((sub) =>
        describe(named(sub, "go", "aller"), "travel.go.desc").addStringOption((o) =>
            describe(named(o, "destination"), "opt.destination").setRequired(true).setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) => describe(named(sub, "map", "carte"), "travel.map.desc"))
    .addSubcommand((sub) => describe(named(sub, "here", "ici"), "travel.here.desc"));

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    if (!interaction.inGuild()) return suggest(interaction, []);
    const locale = resolveLocale(interaction.locale);
    const player = await loadPlayer(interaction.client, interaction.guildId!, interaction.user.id);
    if (!player) return suggest(interaction, []);
    const seen = new Set<string>();
    const choices = routesFrom(interaction.client.RPG, player.location)
        .filter((route) => !seen.has(route.id) && seen.add(route.id))
        .map((route) => ({ name: locationName(locale, route.id), value: route.id }));
    await suggest(interaction, choices);
}

function routeLine(locale: Locale, route: Route): string {
    return `• ${t(locale, "travel.route", {
        place: locationName(locale, route.id),
        mode: t(locale, route.mode === "land" ? "travel.land" : "travel.boat"),
        distance: route.distance,
        danger: route.danger,
    })}`;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    switch (interaction.options.getSubcommand()) {
        case "here": {
            const flags = readMap(world).find((place) => place.locationId === player.location)?.locationFlags ?? 0;
            const routes = routesFrom(world, player.location);
            await interaction.reply(
                reply(
                    panel(
                        `## ${withEmoji("location", t(locale, "travel.hereTitle"))}`,
                        `**${locationName(locale, player.location)}**${flagsText(locale, flags) ? ` — ${flagsText(locale, flags)}` : ""}`,
                        `**${t(locale, "travel.routes")}**\n${routes.length > 0 ? routes.map((r) => routeLine(locale, r)).join("\n") : t(locale, "travel.noRoutes")}`,
                    ),
                    { ephemeral: true },
                ),
            );
            return;
        }

        case "map": {
            const lines = readMap(world).map((place) => {
                const mark = place.locationId === player.location ? ` ← ${t(locale, "travel.here")}` : "";
                const flags = flagsText(locale, place.locationFlags);
                const links = new Set(
                    [...place.travelConnections.landRoutes, ...place.travelConnections.boatRoutes].map((r) =>
                        locationName(locale, r.destinationLocationId),
                    ),
                );
                return `**${locationName(locale, place.locationId)}**${mark}${flags ? ` (${flags})` : ""}\n  ${[...links].join(", ")}`;
            });
            await sendPaged(interaction, locale, {
                title: withEmoji("map", t(locale, "travel.mapTitle")),
                lines,
                perPage: 8,
                ephemeral: true,
            });
            return;
        }

        case "go": {
            const destination = interaction.options.getString("destination", true);
            const route = routesFrom(world, player.location).find((r) => r.id === destination);
            if (!route) {
                await interaction.reply(reply(panel(withEmoji("error", t(locale, "travel.noRoute"))), { ephemeral: true }));
                return;
            }

            const place = locationName(locale, destination);
            await interaction.reply(
                reply(panel(withEmoji("travel", t(locale, "travel.departure", { place })))),
            );

            // `moveTo` attend la fin complète du trajet ; le guard bloque le joueur pendant ce temps.
            const result = await player.moveTo(destination, route.distance, route.danger);
            await persist(interaction.client, player);

            const blocks: string[] = [
                `## ${withEmoji("location", t(locale, "travel.arrived", { place: locationName(locale, result.locationId), duration: formatDuration(result.travelDurationMs) }))}`,
            ];
            if (result.attacked && result.enemy) {
                blocks.push(
                    withEmoji(
                        "enemy",
                        t(locale, "travel.ambushed", {
                            enemy: enemyName(locale, result.enemy),
                            tier: tierLabel(locale, result.enemy.tier),
                        }),
                    ),
                    enemySheet(locale, result.enemy).join("\n"),
                );
            }
            if (!result.arrived) blocks[0] = `## ${withEmoji("travel", t(locale, "travel.interrupted", { place }))}`;
            await interaction.editReply(edit(panel(...blocks)) as never);
            void num;
        }
    }
}
