import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { LocationFlags } from "dragons-of-legends.js";
import { suggest } from "../core/autocomplete";
import { emoji, locationIcon, withEmoji } from "../core/emojis";
import { wrap } from "../core/text";
import { locationName, tierLabel } from "../core/format";
import { loadPlayer, persist, requirePlayer } from "../core/player";
import { edit, panel, reply } from "../core/ui";
import { describe, formatDuration, named, resolveLocale, t, type Locale, type MessageKey } from "../i18n";
import { ambushEdit, attachCombatControls, enemyName } from "./combat";

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
    const locale = resolveLocale(interaction.locale);
    const player = await loadPlayer(interaction.client, interaction.user.id);
    if (!player) return suggest(interaction, []);
    const seen = new Set<string>();
    const choices = routesFrom(interaction.client.RPG, player.location)
        .filter((route) => !seen.has(route.id) && seen.add(route.id))
        .map((route) => ({ name: locationName(locale, route.id), value: route.id }));
    await suggest(interaction, choices);
}

function routeLine(locale: Locale, route: Route): string {
    return t(locale, "travel.route", {
        mode: emoji(route.mode === "land" ? "travel" : "boat"),
        place: locationName(locale, route.id),
        distanceIcon: emoji("distance"),
        distance: route.distance,
        dangerIcon: emoji("danger"),
        danger: route.danger,
    });
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    switch (interaction.options.getSubcommand()) {
        case "here": {
            const flags = readMap(world).find((place) => place.locationId === player.location)?.locationFlags ?? 0;
            const type = world.location.get(player.location)?.locationType ?? "city";
            const routes = routesFrom(world, player.location);
            await interaction.reply(
                reply(
                    panel(
                        `## ${emoji(locationIcon(type))} ${locationName(locale, player.location)}`,
                        flagsText(locale, flags) ? `-# ${flagsText(locale, flags)}` : null,
                        routes.length > 0
                            ? `${routes.map((r) => routeLine(locale, r)).join("\n")}\n-# ${t(locale, "travel.legend", { distanceIcon: emoji("distance"), dangerIcon: emoji("danger") })}`
                            : t(locale, "travel.noRoutes"),
                    ),
                    { ephemeral: true },
                ),
            );
            return;
        }

        case "map": {
            // Carte volontairement sobre : les lieux par type, le tien marqué. Les routes sont dans `/travel here`.
            const places = readMap(world);
            const groups = new Map<string, string[]>();
            for (const place of places) {
                const type = world.location.get(place.locationId)?.locationType ?? "city";
                const here = place.locationId === player.location;
                const name = here ? `**${locationName(locale, place.locationId)}** ${emoji("location")}` : locationName(locale, place.locationId);
                groups.set(type, [...(groups.get(type) ?? []), name]);
            }
            const blocks = [...groups].map(
                ([type, names]) => `### ${emoji(locationIcon(type))} ${t(locale, `location.${type}` as MessageKey)}\n${wrap(names.join("  •  "))}`,
            );
            await interaction.reply(
                reply(
                    panel(`## ${emoji("map")} ${t(locale, "travel.mapTitle")}`, ...blocks, `-# ${t(locale, "travel.mapHint")}`),
                    { ephemeral: true },
                ),
            );
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

            const arrival = result.arrived
                ? `## ${withEmoji("location", t(locale, "travel.arrived", { place: locationName(locale, result.locationId), duration: formatDuration(result.travelDurationMs) }))}`
                : `## ${withEmoji("travel", t(locale, "travel.interrupted", { place }))}`;

            if (result.attacked && result.enemy) {
                // Embuscade : le combat a déjà commencé, on affiche directement l'interface de combat.
                const ambush = withEmoji(
                    "enemy",
                    t(locale, "travel.ambushed", {
                        enemy: enemyName(locale, result.enemy),
                        tier: tierLabel(locale, result.enemy.tier),
                    }),
                );
                const payload = await ambushEdit(interaction.client, locale, player, result.enemy, [arrival, ambush]);
                const message = await interaction.editReply(payload as never);
                attachCombatControls(message, interaction.client, player, locale);
                return;
            }
            await interaction.editReply(edit(panel(arrival)) as never);
        }
    }
}
