import {
    ContainerBuilder,
    MessageFlags,
    SectionBuilder,
    SlashCommandBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    escapeMarkdown,
    type ChatInputCommandInteraction,
} from "discord.js";
import { withEmoji } from "../core/emojis";
import { attributeLabel, goldText, locationName, num } from "../core/format";
import { requireTargetPlayer, userIdOf } from "../core/player";
import { bar, clip } from "../core/ui";
import { contentName } from "../i18n/content";
import { describe, formatDuration, named, resolveLocale, t } from "../i18n";

export const data = describe(named(new SlashCommandBuilder(), "profile", "profil"), "profile.desc").addUserOption(
    (o) => describe(named(o, "user", "joueur"), "opt.user"),
);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const world = interaction.client.RPG;
    const target = interaction.options.getUser("user") ?? interaction.user;

    const player = await requireTargetPlayer(interaction, target.id);
    if (!player) return;

    const playerClass = world.classes.get(player.classId);
    const title = player.titles.getEquipped();
    const modifiers = await player.getModifiers();
    const progress = player.bestiary.getProgress();
    const unlocked = world.achievements.getUnlocked(player.id).length;
    const totalAchievements = world.achievements.list().length;
    const place = world.location.get(player.location);

    const attributes = player.attributes;
    const points = attributes.points > 0 ? ` (**${attributes.points}** ${t(locale, "profile.points")})` : "";

    const bonuses = [
        modifiers.xpMultiplier !== 1 ? t(locale, "profile.xpMultiplier", { value: modifiers.xpMultiplier }) : null,
        modifiers.luckPercent !== 0 ? t(locale, "profile.luck", { value: modifiers.luckPercent }) : null,
        modifiers.critRateBonus !== 0 ? t(locale, "profile.crit", { value: modifiers.critRateBonus }) : null,
    ].filter(Boolean);

    const effects = player.effects
        .list()
        .map((e) => `${contentName(locale, "effect", e.effectId, e.name)} (${formatDuration(e.remainingMs)})`);

    const jobs = player.jobs
        .listProgress()
        .map((j) => `${contentName(locale, "job", j.jobId, j.name)} ${t(locale, "common.levelShort")} ${j.level}`);

    const lines = [
        `## ${withEmoji("user", escapeMarkdown(player.name))}`,
        `*${title ? contentName(locale, "title", title.id, title.name) : t(locale, "profile.noTitle")}*`,
        "",
        `**${t(locale, "profile.class")}** : ${playerClass ? contentName(locale, "class", playerClass.id, playerClass.name) : player.classId}`,
        withEmoji("level", `**${t(locale, "profile.level")}** : ${player.level}`),
        withEmoji(
            "experience",
            `**${t(locale, "profile.xp")}** : ${bar(player.experience.current, player.experience.required)} ${num(locale, player.experience.current)}/${num(locale, player.experience.required)}`,
        ),
        withEmoji(
            "health",
            `**${t(locale, "profile.hp")}** : ${bar(player.health.current, player.health.max)} ${num(locale, player.health.current)}/${num(locale, player.health.max)}`,
        ),
        withEmoji("gold", `**${t(locale, "profile.wallet")}** : ${goldText(locale, player.gold)}`),
        player.bankUnlocked
            ? withEmoji("bank", `**${t(locale, "profile.bank")}** : ${goldText(locale, player.bankGold)}`)
            : null,
        withEmoji(
            "location",
            `**${t(locale, "profile.location")}** : ${locationName(locale, player.location)}${place ? ` (${t(locale, `location.${place.locationType}`)})` : ""}`,
        ),
        "",
        `**${t(locale, "profile.attributes")}** : ${attributeLabel(locale, "strength")} **${attributes.strength}** • ${attributeLabel(locale, "agility")} **${attributes.agility}** • ${attributeLabel(locale, "intelligence")} **${attributes.intelligence}** • ${attributeLabel(locale, "defense")} **${attributes.defense}**${points}`,
        bonuses.length > 0 ? `**${t(locale, "profile.modifiers")}** : ${bonuses.join(" • ")}` : null,
        effects.length > 0 ? `**${t(locale, "profile.effects")}** : ${effects.join(" • ")}` : null,
        jobs.length > 0 ? `**${t(locale, "profile.jobs")}** : ${jobs.join(" • ")}` : null,
        player.marriage.isMarried()
            ? withEmoji(
                  "marriage",
                  t(locale, "profile.marriage", { partner: `<@${userIdOf(player.marriage.getPartnerId())}>` }),
              )
            : null,
        `**${t(locale, "profile.bestiary")}** : ${progress.discovered}/${progress.total} • **${t(locale, "profile.achievements")}** : ${unlocked}/${totalAchievements}`,
    ].filter((line): line is string => line !== null);

    const container = new ContainerBuilder().addSectionComponents(
        new SectionBuilder()
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.displayAvatarURL()))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(clip(lines.join("\n")))),
    );

    await interaction.reply({
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
        allowedMentions: { parse: [] },
    });
}
