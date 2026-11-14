import {
    InteractionContextType,
    PermissionFlagsBits,
    SlashCommandBuilder,
    type AutocompleteInteraction,
    type ChatInputCommandInteraction,
} from "discord.js";
import { suggest } from "../core/autocomplete";
import { withEmoji } from "../core/emojis";
import { itemName, locationName, num } from "../core/format";
import { persist, requireTargetPlayer } from "../core/player";
import { panel, reply } from "../core/ui";
import { contentName } from "../i18n/content";
import { choice, describe, named, resolveLocale, t, type MessageKey } from "../i18n";

/** Les commandes admin ignorent le guard : un admin doit pouvoir réparer un joueur bloqué. */
export const bypassGuard = true;

const user = (o: import("discord.js").SlashCommandUserOption) =>
    describe(named(o, "user", "joueur"), "opt.user").setRequired(true);
const amount = (o: import("discord.js").SlashCommandIntegerOption, min = 1) =>
    describe(named(o, "amount", "montant"), "opt.amount").setRequired(true).setMinValue(min).setMaxValue(1_000_000_000);
const modeOption = (o: import("discord.js").SlashCommandStringOption) =>
    describe(named(o, "mode"), "opt.mode")
        .setRequired(true)
        .addChoices(choice("opt.mode.add", "add"), choice("opt.mode.remove", "remove"));

export const data = describe(named(new SlashCommandBuilder(), "admin"), "admin.desc")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((sub) => describe(named(sub, "revive", "ressusciter"), "admin.revive.desc").addUserOption(user))
    .addSubcommand((sub) =>
        describe(named(sub, "item", "objet"), "admin.item.desc")
            .addUserOption(user)
            .addStringOption((o) => describe(named(o, "item", "objet"), "opt.item").setRequired(true).setAutocomplete(true))
            .addStringOption(modeOption)
            .addIntegerOption((o) => describe(named(o, "quantity", "quantité"), "opt.quantity").setMinValue(1).setMaxValue(10_000)),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "gold", "or"), "admin.gold.desc").addUserOption(user).addStringOption(modeOption).addIntegerOption((o) => amount(o)),
    )
    .addSubcommand((sub) => describe(named(sub, "xp"), "admin.xp.desc").addUserOption(user).addIntegerOption((o) => amount(o)))
    .addSubcommand((sub) => describe(named(sub, "heal", "soigner"), "admin.heal.desc").addUserOption(user).addIntegerOption((o) => amount(o)))
    .addSubcommand((sub) =>
        describe(named(sub, "title", "titre"), "admin.title.desc")
            .addUserOption(user)
            .addStringOption((o) => describe(named(o, "title", "titre"), "opt.title").setRequired(true).setAutocomplete(true))
            .addStringOption(modeOption),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "achievement", "succès"), "admin.achievement.desc")
            .addUserOption(user)
            .addStringOption((o) => describe(named(o, "achievement", "succès"), "opt.achievement").setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "effect", "effet"), "admin.effect.desc")
            .addUserOption(user)
            .addStringOption((o) => describe(named(o, "effect", "effet"), "opt.effect").setRequired(true).setAutocomplete(true))
            .addStringOption(modeOption),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "teleport", "téléporter"), "admin.teleport.desc")
            .addUserOption(user)
            .addStringOption((o) => describe(named(o, "location", "lieu"), "opt.location").setRequired(true).setAutocomplete(true)),
    );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    switch (interaction.options.getFocused(true).name) {
        case "item":
            return suggest(interaction, world.items.list().map((i) => ({ name: itemName(locale, i), value: i.itemId })));
        case "title":
            return suggest(interaction, world.titles.list().map((x) => ({ name: contentName(locale, "title", x.id, x.name), value: x.id })));
        case "achievement":
            return suggest(interaction, world.achievements.list().map((x) => ({ name: contentName(locale, "achievement", x.id, x.name), value: x.id })));
        case "effect":
            return suggest(interaction, world.effects.list().map((x) => ({ name: contentName(locale, "effect", x.id, x.name), value: x.id })));
        case "location": {
            const places = JSON.parse(world.location.serialize()) as { locationId: string }[];
            return suggest(interaction, places.map((p) => ({ name: locationName(locale, p.locationId), value: p.locationId })));
        }
        default:
            return suggest(interaction, []);
    }
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const say = (key: MessageKey, vars: Record<string, string | number> = {}, ok = true) =>
        interaction.reply(reply(panel(withEmoji(ok ? "admin" : "error", t(locale, key, vars))), { ephemeral: true }));

    // Vérifié à l'exécution en plus des permissions par défaut, que les serveurs peuvent réécrire.
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await say("admin.denied", {}, false);
        return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const player = await requireTargetPlayer(interaction, targetUser.id);
    if (!player) return;
    const who = `<@${targetUser.id}>`;
    const sub = interaction.options.getSubcommand();
    const adding = interaction.options.getString("mode") !== "remove";

    switch (sub) {
        case "revive": {
            const revived = await world.players.revive(player.id);
            await persist(interaction.client, player);
            await say(revived ? "admin.done.revive" : "admin.done.reviveFailed", { user: who }, revived);
            return;
        }
        case "item": {
            const itemId = interaction.options.getString("item", true);
            const item = world.items.require(itemId);
            const quantity = interaction.options.getInteger("quantity") ?? 1;
            if (adding) {
                await player.inventory.add(itemId, quantity);
            } else if (!(await player.inventory.remove(itemId, quantity))) {
                await say("admin.done.itemRemoveFailed", { user: who }, false);
                return;
            }
            await persist(interaction.client, player);
            await say(adding ? "admin.done.itemAdd" : "admin.done.itemRemove", { user: who, quantity, item: itemName(locale, item) });
            return;
        }
        case "gold": {
            const value = interaction.options.getInteger("amount", true);
            player.gold = Math.max(0, player.gold + (adding ? value : -value));
            await persist(interaction.client, player);
            await say("admin.done.gold", {
                user: who,
                amount: num(locale, value),
                mode: t(locale, adding ? "opt.mode.add" : "opt.mode.remove"),
                total: num(locale, player.gold),
            });
            return;
        }
        case "xp": {
            const value = interaction.options.getInteger("amount", true);
            await player.gainXP(value);
            await persist(interaction.client, player);
            await say("admin.done.xp", { user: who, amount: num(locale, value), level: player.level });
            return;
        }
        case "heal": {
            const healed = player.heal(interaction.options.getInteger("amount", true), "admin");
            await persist(interaction.client, player);
            await say("admin.done.heal", { user: who, amount: num(locale, healed) });
            return;
        }
        case "title": {
            const id = interaction.options.getString("title", true);
            const changed = adding ? await player.titles.grant(id) : await player.titles.revoke(id);
            await persist(interaction.client, player);
            const title = world.titles.has(id) ? contentName(locale, "title", id, world.titles.require(id).name) : id;
            await say(changed ? (adding ? "admin.done.titleAdd" : "admin.done.titleRemove") : "admin.done.titleNoChange", { user: who, title }, changed);
            return;
        }
        case "achievement": {
            const id = interaction.options.getString("achievement", true);
            const changed = await world.achievements.unlock(player.id, id);
            await persist(interaction.client, player);
            const name = contentName(locale, "achievement", id, world.achievements.get(id)?.name ?? id);
            await say(changed ? "admin.done.achievement" : "admin.done.achievementNoChange", { user: who, name }, changed);
            return;
        }
        case "effect": {
            const id = interaction.options.getString("effect", true);
            const name = contentName(locale, "effect", id, world.effects.require(id).name);
            let changed = true;
            if (adding) await player.effects.apply(id);
            else changed = await player.effects.remove(id);
            await persist(interaction.client, player);
            await say(changed ? (adding ? "admin.done.effectAdd" : "admin.done.effectRemove") : "admin.done.effectNoChange", { user: who, name }, changed);
            return;
        }
        case "teleport": {
            if (player.inCombat || player.isTravelling) {
                await say("admin.blocked", { user: who }, false);
                return;
            }
            const place = interaction.options.getString("location", true);
            if (!world.location.has(place)) {
                await say("err.unknownLocation", {}, false);
                return;
            }
            player.location = place;
            await persist(interaction.client, player);
            await say("admin.done.teleport", { user: who, place: locationName(locale, place) });
        }
    }
}
