import {
    SlashCommandBuilder,
    escapeMarkdown,
    type AutocompleteInteraction,
    type ChatInputCommandInteraction,
} from "discord.js";
import { suggest } from "../core/autocomplete";
import { confirm } from "../core/confirm";
import { withEmoji } from "../core/emojis";
import { goldText, locationName } from "../core/format";
import { playerIdOf } from "../core/guard";
import { persist } from "../core/player";
import { edit, panel, reply } from "../core/ui";
import { sendPaged } from "../core/paginate";
import { contentDescription, contentName } from "../i18n/content";
import { attributeLabel } from "../core/format";
import { describe, named, resolveLocale, t } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "character", "personnage"), "character.desc")
    .addSubcommand((sub) =>
        describe(named(sub, "create", "créer"), "character.create.desc")
            .addStringOption((o) =>
                describe(named(o, "class", "classe"), "opt.class").setRequired(true).setAutocomplete(true),
            )
            .addStringOption((o) => describe(named(o, "name", "nom"), "opt.name").setMaxLength(32)),
    )
    .addSubcommand((sub) => describe(named(sub, "delete", "supprimer"), "character.delete.desc"))
    .addSubcommand((sub) => describe(named(sub, "classes", "classes"), "character.classes.desc"));

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    await suggest(
        interaction,
        interaction.client.RPG.classes.list().map((c) => ({
            name: contentName(locale, "class", c.id, c.name),
            value: c.id,
        })),
    );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    if (sub === "create") return create(interaction);
    if (sub === "delete") return remove(interaction);
    return classes(interaction);
}

async function create(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const id = playerIdOf(interaction.guildId!, interaction.user.id);

    if (await world.players.exist(id)) {
        await interaction.reply(
            reply(panel(withEmoji("error", t(locale, "err.alreadyExists"))), { ephemeral: true }),
        );
        return;
    }

    const classId = interaction.options.getString("class", true);
    const playerClass = world.classes.get(classId);
    if (!playerClass) {
        await interaction.reply(
            reply(panel(withEmoji("error", t(locale, "err.unknownClass"))), { ephemeral: true }),
        );
        return;
    }

    const name = interaction.options.getString("name") ?? interaction.user.displayName;
    const player = await world.players.create({ id, name, playerClass: classId });

    // Titre de départ : accordé et équipé à la création (et non à chaque consultation du profil).
    if (world.titles.has("novice_adventurer")) {
        await player.titles.grant("novice_adventurer");
        await player.titles.equip("novice_adventurer");
    }
    await persist(interaction.client, player);

    const items = (await player.inventory.getItems()).reduce((sum, item) => sum + item.quantity, 0);

    await interaction.reply(
        reply(
            panel(
                `## ${withEmoji("character", t(locale, "character.created.title", { name: escapeMarkdown(player.name) }))}`,
                t(locale, "character.created.body", {
                    class: contentName(locale, "class", playerClass.id, playerClass.name),
                    location: locationName(locale, player.location),
                    gold: goldText(locale, player.gold),
                    items: t(locale, "character.items.count", { count: items }),
                }),
                `-# ${t(locale, "character.created.hint")}`,
            ),
        ),
    );
}

async function remove(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const id = playerIdOf(interaction.guildId!, interaction.user.id);

    if (!(await world.players.exist(id))) {
        await interaction.reply(reply(panel(withEmoji("error", t(locale, "error.noCharacter"))), { ephemeral: true }));
        return;
    }

    if (!(await confirm(interaction, locale, t(locale, "character.delete.confirm")))) return;

    const deleted = await world.players.delete(id);
    await interaction.editReply(
        edit(panel(t(locale, deleted ? "character.deleted" : "character.deleteFailed"))),
    );
}

async function classes(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const lines = interaction.client.RPG.classes.list().map((c) => {
        const description = contentDescription(locale, "class", c.id, c.description);
        const stats = t(locale, "character.classes.stats", {
            strength: c.baseStats.strength,
            agility: c.baseStats.agility,
            intelligence: c.baseStats.intelligence,
            defense: c.baseStats.defense,
        });
        const attack = c.attackStat
            ? `\n  ${t(locale, "character.classes.attack", { stat: attributeLabel(locale, c.attackStat) })}`
            : "";
        return `**${contentName(locale, "class", c.id, c.name)}**${description ? ` — ${description}` : ""}\n  ${stats}${attack}`;
    });

    await sendPaged(interaction, locale, {
        title: withEmoji("character", t(locale, "character.classes.title")),
        lines,
        perPage: 6,
    });
}
