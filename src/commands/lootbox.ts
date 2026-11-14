import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { suggest } from "../core/autocomplete";
import { withEmoji } from "../core/emojis";
import { captureEvents, eventsNamed } from "../core/events";
import { itemName, rarityLabel } from "../core/format";
import { persist, requirePlayer, type Player } from "../core/player";
import { sendPaged } from "../core/paginate";
import { describeRewards } from "../core/rewards";
import { panel, reply } from "../core/ui";
import { contentName } from "../i18n/content";
import { describe, named, resolveLocale, t } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "lootbox", "pochette"), "lootbox.desc")
    .addSubcommand((sub) => describe(named(sub, "list", "liste"), "lootbox.list.desc"))
    .addSubcommand((sub) =>
        describe(named(sub, "chances", "probabilités"), "lootbox.chances.desc").addStringOption((o) =>
            describe(named(o, "lootbox", "pochette"), "opt.lootbox").setRequired(true).setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "open", "ouvrir"), "lootbox.open.desc")
            .addStringOption((o) =>
                describe(named(o, "lootbox", "pochette"), "opt.lootbox").setRequired(true).setAutocomplete(true),
            )
            .addIntegerOption((o) =>
                describe(named(o, "quantity", "quantité"), "opt.quantity").setMinValue(1).setMaxValue(25),
            ),
    );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    await suggest(
        interaction,
        interaction.client.RPG.lootboxes
            .list()
            .map((box) => ({ name: contentName(locale, "lootbox", box.id, box.name), value: box.id })),
    );
}

/** Objet « pochette » qui ouvre cette pochette quand on l'utilise. */
function pouchItemId(world: ChatInputCommandInteraction["client"]["RPG"], lootboxId: string): string | undefined {
    return world.items.list().find((item) => item.use?.lootbox === lootboxId)?.itemId;
}

async function ownedCount(player: Player, itemId: string): Promise<number> {
    return (await player.inventory.getItems())
        .filter((record) => record.itemId === itemId)
        .reduce((sum, record) => sum + record.quantity, 0);
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
        const lines: string[] = [];
        for (const box of world.lootboxes.list()) {
            const itemId = pouchItemId(world, box.id);
            const owned = itemId ? await ownedCount(player, itemId) : 0;
            lines.push(
                `**${contentName(locale, "lootbox", box.id, box.name)}** • ${rarityLabel(locale, box.rarity)} • ${t(locale, "lootbox.owned", { count: owned })}`,
            );
        }
        await sendPaged(interaction, locale, {
            title: withEmoji("lootbox", t(locale, "lootbox.title")),
            lines,
            ephemeral: true,
        });
        return;
    }

    const lootboxId = interaction.options.getString("lootbox", true);
    const box = world.lootboxes.require(lootboxId);
    const boxName = contentName(locale, "lootbox", box.id, box.name);

    if (sub === "chances") {
        const luck = (await player.getModifiers()).luckPercent;
        const lines = world.lootboxes.getDropChances(lootboxId, luck).map(({ drop, chance }) => {
            const percent = `${(chance * 100).toFixed(chance < 0.1 ? 2 : 1)} %`;
            if (drop.kind === "gold") {
                return `• ${t(locale, "lootbox.dropGold", { min: drop.minAmount, max: drop.maxAmount })} — **${percent}**`;
            }
            const item = world.items.get(drop.itemId);
            return `• ${t(locale, "lootbox.dropItem", {
                min: drop.minQuantity,
                max: drop.maxQuantity,
                item: item ? itemName(locale, item) : drop.itemId,
            })} — **${percent}**`;
        });
        await sendPaged(interaction, locale, {
            title: withEmoji("lootbox", t(locale, "lootbox.chancesTitle", { box: boxName })),
            intro: t(locale, "lootbox.luck", { value: luck }),
            lines,
            ephemeral: true,
        });
        return;
    }

    // open : on passe par l'objet pochette (qui est consommé), jamais par `lootboxes.open` directement,
    // sinon n'importe qui pourrait ouvrir des pochettes gratuitement.
    const itemId = pouchItemId(world, lootboxId);
    if (!itemId) {
        await interaction.reply(reply(panel(withEmoji("error", t(locale, "lootbox.noItem"))), { ephemeral: true }));
        return;
    }

    const quantity = interaction.options.getInteger("quantity") ?? 1;
    const { result: used, events } = await captureEvents(world, player.id, () =>
        player.inventory.use(itemId, quantity),
    );
    if (!used) {
        await interaction.reply(
            reply(panel(withEmoji("error", t(locale, "lootbox.noPouch", { box: boxName }))), { ephemeral: true }),
        );
        return;
    }
    await persist(interaction.client, player);

    const results = eventsNamed(events, "itemUse").flatMap((usage) => usage.lootboxes);
    await interaction.reply(
        reply(
            panel(
                `## ${withEmoji("lootbox", t(locale, "lootbox.opened", { quantity, box: boxName }))}`,
                describeRewards(locale, results).join("\n"),
            ),
        ),
    );
}

