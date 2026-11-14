import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { withEmoji } from "../core/emojis";
import { goldText } from "../core/format";
import { persist, requirePlayer } from "../core/player";
import { panel, reply } from "../core/ui";
import { describe, named, resolveLocale, t } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "bank", "banque"), "bank.desc")
    .addSubcommand((sub) => describe(named(sub, "balance", "solde"), "bank.balance.desc"))
    .addSubcommand((sub) =>
        describe(named(sub, "deposit", "déposer"), "bank.deposit.desc").addIntegerOption((o) =>
            describe(named(o, "amount", "montant"), "opt.amount").setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((sub) =>
        describe(named(sub, "withdraw", "retirer"), "bank.withdraw.desc").addIntegerOption((o) =>
            describe(named(o, "amount", "montant"), "opt.amount").setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((sub) => describe(named(sub, "unlock", "débloquer"), "bank.unlock.desc"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const player = await requirePlayer(interaction);
    if (!player) return;

    const sub = interaction.options.getSubcommand();
    const unlockCost = world.initializationOptions.bankUnlockCost ?? 0;

    if (sub === "unlock") {
        const unlocked = world.bank.unlock(player);
        if (!unlocked) {
            await interaction.reply(reply(panel(withEmoji("error", t(locale, "bank.unlockFailed"))), { ephemeral: true }));
            return;
        }
        await persist(interaction.client, player);
        await interaction.reply(
            reply(
                panel(
                    withEmoji(
                        "bank",
                        t(locale, "bank.unlocked", {
                            cost: unlockCost > 0 ? goldText(locale, unlockCost) : t(locale, "common.free"),
                        }),
                    ),
                ),
            ),
        );
        return;
    }

    if (sub === "deposit" || sub === "withdraw") {
        const amount = interaction.options.getInteger("amount", true);
        const result =
            sub === "deposit" ? await world.bank.deposit(player, amount) : await world.bank.withdraw(player, amount);
        await persist(interaction.client, player);
        await interaction.reply(
            reply(
                panel(
                    withEmoji(
                        "bank",
                        t(locale, sub === "deposit" ? "bank.deposited" : "bank.withdrawn", {
                            amount: goldText(locale, amount),
                        }),
                    ),
                    t(locale, "bank.newBalance", { gold: goldText(locale, result.balance) }),
                ),
            ),
        );
        return;
    }

    // balance
    const limit = world.initializationOptions.bankMaxGoldLimit ?? 500_000;
    const effectiveLimit = limit === -1 ? -1 : player.marriage.isMarried() ? limit * 2 : limit;
    const lines = [`## ${withEmoji("bank", t(locale, "bank.title"))}`];

    if (!player.bankUnlocked) {
        await interaction.reply(
            reply(
                panel(
                    lines[0],
                    withEmoji("gold", `**${t(locale, "bank.wallet")}** : ${goldText(locale, player.gold)}`),
                    t(locale, "bank.locked", {
                        cost: unlockCost > 0 ? goldText(locale, unlockCost) : t(locale, "common.free"),
                    }),
                ),
            ),
        );
        return;
    }

    const { balance } = await world.bank.solde(player);
    await interaction.reply(
        reply(
            panel(
                lines[0],
                [
                    withEmoji("gold", `**${t(locale, "bank.wallet")}** : ${goldText(locale, player.gold)}`),
                    withEmoji("bank", `**${t(locale, "bank.account")}** : ${goldText(locale, player.bankGold)}`),
                    balance !== player.bankGold
                        ? `**${t(locale, "bank.total")}** : ${goldText(locale, balance)}`
                        : null,
                    `**${t(locale, "bank.limit")}** : ${effectiveLimit === -1 ? t(locale, "bank.unlimited") : goldText(locale, effectiveLimit)}`,
                ]
                    .filter(Boolean)
                    .join("\n"),
            ),
        ),
    );
}
