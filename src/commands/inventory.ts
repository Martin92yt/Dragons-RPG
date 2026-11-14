import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import type { EquipmentSlot } from "dragons-of-legends.js";
import type { InventoryItemRecord } from "dragons-of-legends.js/dist/inventory/inventory.interface.js";
import { suggest } from "../core/autocomplete";
import { confirm } from "../core/confirm";
import { withEmoji } from "../core/emojis";
import { captureEvents, eventsNamed } from "../core/events";
import { categoryLabel, goldText, itemLine, itemName, slotLabel } from "../core/format";
import { loadPlayer, persist, requirePlayer } from "../core/player";
import { sendPaged } from "../core/paginate";
import { describeRewards, EQUIPMENT_SLOTS } from "../core/rewards";
import { edit, panel, reply } from "../core/ui";
import { contentName } from "../i18n/content";
import { choice, describe, named, resolveLocale, t } from "../i18n";

const CATEGORIES = ["weapons", "armor", "consumables", "materials", "valuables", "amulet", "tool"] as const;
const EQUIPPABLE = new Set(["weapons", "armor", "amulet"]);

export const data = describe(named(new SlashCommandBuilder(), "inventory", "inventaire"), "inventory.desc")
    .addSubcommand((sub) =>
        describe(named(sub, "view", "voir"), "inventory.view.desc").addStringOption((o) =>
            describe(named(o, "category", "catégorie"), "opt.category").addChoices(
                ...CATEGORIES.map((c) => choice(`category.${c}`, c)),
            ),
        ),
    )
    .addSubcommand((sub) => describe(named(sub, "equipment", "équipement"), "inventory.equipment.desc"))
    .addSubcommand((sub) =>
        describe(named(sub, "equip", "équiper"), "inventory.equip.desc")
            .addStringOption((o) =>
                describe(named(o, "item", "objet"), "opt.item").setRequired(true).setAutocomplete(true),
            )
            .addStringOption((o) =>
                describe(named(o, "slot", "emplacement"), "opt.slot")
                    .setRequired(true)
                    .addChoices(...EQUIPMENT_SLOTS.map((s) => choice(`slot.${s}`, s))),
            ),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "unequip", "déséquiper"), "inventory.unequip.desc").addStringOption((o) =>
            describe(named(o, "slot", "emplacement"), "opt.slot")
                .setRequired(true)
                .addChoices(...EQUIPMENT_SLOTS.map((s) => choice(`slot.${s}`, s))),
        ),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "use", "utiliser"), "inventory.use.desc")
            .addStringOption((o) =>
                describe(named(o, "item", "objet"), "opt.item").setRequired(true).setAutocomplete(true),
            )
            .addIntegerOption((o) =>
                describe(named(o, "quantity", "quantité"), "opt.quantity").setMinValue(1).setMaxValue(50),
            ),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "sell", "vendre"), "inventory.sell.desc")
            .addStringOption((o) =>
                describe(named(o, "item", "objet"), "opt.item").setRequired(true).setAutocomplete(true),
            )
            .addIntegerOption((o) =>
                describe(named(o, "quantity", "quantité"), "opt.quantity").setMinValue(1).setMaxValue(9999),
            ),
    )
    .addSubcommand((sub) => describe(named(sub, "clear", "vider"), "inventory.clear.desc"));

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    if (!interaction.inGuild()) return suggest(interaction, []);
    const locale = resolveLocale(interaction.locale);
    const player = await loadPlayer(interaction.client, interaction.guildId!, interaction.user.id);
    if (!player) return suggest(interaction, []);

    const sub = interaction.options.getSubcommand();
    const records = (await player.inventory.getItems()).filter((record) => {
        if (sub === "equip") return EQUIPPABLE.has(record.category) && !record.isEquipped;
        if (sub === "use") return record.category === "consumables" && !record.isEquipped;
        return !record.isEquipped; // sell
    });

    // Un même objet peut occuper plusieurs piles : on les regroupe par identifiant.
    const totals = new Map<string, { name: string; quantity: number }>();
    for (const record of records) {
        const entry = totals.get(record.itemId);
        if (entry) entry.quantity += record.quantity;
        else totals.set(record.itemId, { name: itemName(locale, record), quantity: record.quantity });
    }

    await suggest(
        interaction,
        [...totals.entries()].map(([value, entry]) => ({ name: `${entry.name} (x${entry.quantity})`, value })),
    );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const player = await requirePlayer(interaction);
    if (!player) return;

    const world = interaction.client.RPG;
    const sub = interaction.options.getSubcommand();

    switch (sub) {
        case "view": {
            const category = interaction.options.getString("category");
            const records = (await player.inventory.getItems()).filter((r) => !category || r.category === category);
            await sendPaged(interaction, locale, {
                title: withEmoji("inventory", t(locale, "inventory.title")),
                intro: category ? t(locale, "inventory.filter", { category: categoryLabel(locale, category) }) : undefined,
                lines: records.map((record) => itemLine(locale, record)),
                emptyText: t(locale, "inventory.empty"),
                ephemeral: true,
            });
            return;
        }

        case "equipment": {
            const equipped = new Map<string, InventoryItemRecord>();
            for (const record of await player.inventory.getItems()) {
                if (record.isEquipped && record.equipmentSlot) equipped.set(record.equipmentSlot, record);
            }
            const lines = EQUIPMENT_SLOTS.map((slot) => {
                const record = equipped.get(slot);
                return `**${slotLabel(locale, slot)}** : ${record ? itemName(locale, record) : t(locale, "inventory.slot.empty")}`;
            });
            await interaction.reply(
                reply(panel(`## ${withEmoji("equipment", t(locale, "inventory.equipment.title"))}`, lines.join("\n"))),
            );
            return;
        }

        case "equip": {
            const itemId = interaction.options.getString("item", true);
            const slot = interaction.options.getString("slot", true) as EquipmentSlot;
            const ok = await player.inventory.equip(slot, itemId);
            if (!ok) {
                await interaction.reply(
                    reply(panel(withEmoji("error", t(locale, "inventory.equipFailed"))), { ephemeral: true }),
                );
                return;
            }
            await persist(interaction.client, player);
            const known = world.items.get(itemId);
            await interaction.reply(
                reply(
                    panel(
                        t(locale, "inventory.equipped", {
                            item: known ? itemName(locale, known) : itemId,
                            slot: slotLabel(locale, slot),
                        }),
                    ),
                ),
            );
            return;
        }

        case "unequip": {
            const slot = interaction.options.getString("slot", true) as EquipmentSlot;
            const ok = await player.inventory.unequip(slot);
            if (!ok) {
                await interaction.reply(
                    reply(panel(withEmoji("error", t(locale, "inventory.unequipFailed"))), { ephemeral: true }),
                );
                return;
            }
            await persist(interaction.client, player);
            await interaction.reply(
                reply(panel(t(locale, "inventory.unequipped", { slot: slotLabel(locale, slot) }))),
            );
            return;
        }

        case "use": {
            const itemId = interaction.options.getString("item", true);
            const quantity = interaction.options.getInteger("quantity") ?? 1;

            // `use` ne renvoie qu'un booléen : le détail (soins, effets, pochettes) vient de l'événement `itemUse`.
            const { result: used, events } = await captureEvents(world, player.id, () =>
                player.inventory.use(itemId, quantity),
            );
            if (!used) {
                await interaction.reply(
                    reply(panel(withEmoji("error", t(locale, "inventory.useFailed"))), { ephemeral: true }),
                );
                return;
            }
            await persist(interaction.client, player);

            const usage = eventsNamed(events, "itemUse")[0];
            const known = world.items.get(itemId);
            const rewards = describeRewards(locale, usage?.lootboxes ?? []);
            const effectNames = [...new Set(usage?.effects ?? [])].map((id) => {
                const effect = world.effects.get(id);
                return contentName(locale, "effect", id, effect?.name ?? id);
            });

            await interaction.reply(
                reply(
                    panel(
                        t(locale, "inventory.used", { quantity, item: known ? itemName(locale, known) : itemId }),
                        usage && usage.healed > 0 ? withEmoji("health", t(locale, "inventory.healed", { healed: usage.healed })) : null,
                        ...effectNames.map((effect) => withEmoji("effect", t(locale, "inventory.effect", { effect }))),
                        rewards.length > 0
                            ? `${withEmoji("lootbox", `**${t(locale, "inventory.lootboxContent")}**`)}\n${rewards.join("\n")}`
                            : null,
                    ),
                ),
            );
            return;
        }

        case "sell": {
            const itemId = interaction.options.getString("item", true);
            const quantity = interaction.options.getInteger("quantity") ?? 1;
            const known = (await player.inventory.getItems()).find((r) => r.itemId === itemId);
            const gold = await player.inventory.sellItem(itemId, quantity);
            if (gold <= 0 || !known) {
                await interaction.reply(
                    reply(panel(withEmoji("error", t(locale, "inventory.sellFailed"))), { ephemeral: true }),
                );
                return;
            }
            await persist(interaction.client, player);
            await interaction.reply(
                reply(
                    panel(
                        withEmoji(
                            "gold",
                            t(locale, "inventory.sold", {
                                quantity,
                                item: itemName(locale, known),
                                gold: goldText(locale, gold),
                            }),
                        ),
                    ),
                ),
            );
            return;
        }

        case "clear": {
            if (!(await confirm(interaction, locale, t(locale, "inventory.clear.confirm")))) return;
            const cleared = await player.inventory.clear();
            if (cleared) await persist(interaction.client, player);
            await interaction.editReply(
                edit(panel(t(locale, cleared ? "inventory.cleared" : "inventory.clearFailed"))),
            );
            return;
        }
    }
}
