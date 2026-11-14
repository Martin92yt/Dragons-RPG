import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { suggest } from "../core/autocomplete";
import { confirm } from "../core/confirm";
import { withEmoji } from "../core/emojis";
import { itemLine, itemName } from "../core/format";
import { loadPlayer, persist, requirePlayer } from "../core/player";
import { sendPaged } from "../core/paginate";
import { edit, panel, reply } from "../core/ui";
import { describe, named, resolveLocale, t } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "vault", "coffre"), "vault.desc")
    .addSubcommand((sub) => describe(named(sub, "list", "liste"), "vault.list.desc"))
    .addSubcommand((sub) =>
        describe(named(sub, "deposit", "déposer"), "vault.deposit.desc")
            .addStringOption((o) =>
                describe(named(o, "item", "objet"), "opt.item").setRequired(true).setAutocomplete(true),
            )
            .addIntegerOption((o) =>
                describe(named(o, "quantity", "quantité"), "opt.quantity").setMinValue(1).setMaxValue(9999),
            ),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "withdraw", "retirer"), "vault.withdraw.desc")
            .addStringOption((o) =>
                describe(named(o, "item", "objet"), "opt.item").setRequired(true).setAutocomplete(true),
            )
            .addIntegerOption((o) =>
                describe(named(o, "quantity", "quantité"), "opt.quantity").setMinValue(1).setMaxValue(9999),
            ),
    )
    .addSubcommand((sub) => describe(named(sub, "clear", "vider"), "vault.clear.desc"));

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const player = await loadPlayer(interaction.client, interaction.user.id);
    if (!player) return suggest(interaction, []);

    const records =
        interaction.options.getSubcommand() === "withdraw"
            ? await player.itemBank.list()
            : (await player.inventory.getItems()).filter((r) => !r.isEquipped);

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
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    const vault = player.itemBank;
    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
        const records = await vault.list();
        const used = await vault.getUsedSlots();
        await sendPaged(interaction, locale, {
            title: withEmoji("vault", t(locale, "vault.title")),
            intro: t(locale, "vault.slots", { used, capacity: vault.getCapacity() }),
            lines: records.map((record) => itemLine(locale, record)),
            emptyText: t(locale, "vault.empty"),
            ephemeral: true,
        });
        return;
    }

    if (sub === "clear") {
        if (!(await confirm(interaction, locale, t(locale, "vault.clear.confirm")))) return;
        const cleared = await vault.clear();
        if (cleared) await persist(interaction.client, player);
        await interaction.editReply(edit(panel(t(locale, cleared ? "vault.cleared" : "vault.clearFailed"))));
        return;
    }

    const itemId = interaction.options.getString("item", true);
    const quantity = interaction.options.getInteger("quantity") ?? 1;
    const transfer = sub === "deposit" ? await vault.deposit(itemId, quantity) : await vault.withdraw(itemId, quantity);
    await persist(interaction.client, player);

    const known = world.items.get(itemId);
    await interaction.reply(
        reply(
            panel(
                withEmoji(
                    "vault",
                    t(locale, sub === "deposit" ? "vault.deposited" : "vault.withdrawn", {
                        quantity: transfer.quantity,
                        item: known ? itemName(locale, known) : itemId,
                        used: transfer.usedSlots,
                        capacity: transfer.capacity,
                    }),
                ),
            ),
        ),
    );
}
