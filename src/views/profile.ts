import { ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, escapeMarkdown, type User } from "discord.js";
import { emoji, jobIcon as jobIconOf } from "../core/emojis";
import { locationName, num } from "../core/format";
import { userIdOf, type Player } from "../core/player";
import { clip } from "../core/ui";
import { contentName } from "../i18n/content";
import { formatDuration, formatIn, t, type Locale } from "../i18n";

/** Séparateur des lignes compactes du profil. */
const SEP = "  •  ";

type World = Player["worldInstance"];

/**
 * Fiche de profil : compacte, quatre à six lignes. C'est LE fichier à modifier pour changer la structure du
 * profil : chaque ligne est construite à part et peut être déplacée, retirée ou complétée sans toucher à la commande.
 */
export async function profileView(
    locale: Locale,
    world: World,
    player: Player,
    owner: User,
): Promise<ContainerBuilder> {
    const title = player.titles.getEquipped();
    const attributes = player.attributes;
    const modifiers = await player.getModifiers();
    const progress = player.bestiary.getProgress();
    const playerClass = world.classes.get(player.classId);

    const status = player.life.isDead
        ? player.life.isPermanentlyDead
            ? t(locale, "profile.statusDeadPermanent")
            : t(locale, "profile.statusDead", { time: formatIn(locale, player.life.getRemainingMs()) })
        : player.inCombat
          ? t(locale, "profile.statusCombat")
          : player.isTravelling
            ? t(locale, "profile.statusTravel")
            : t(locale, "profile.statusIdle");

    const header = `## ${emoji("character")} __${escapeMarkdown(player.name)}__${
        title ? `  *${contentName(locale, "title", title.id, title.name)}*` : ""
    }`;

    const vitals = [
        `${emoji("level")} **${player.level}**`,
        `${emoji("experience")} **${num(locale, player.experience.current)}**/${num(locale, player.experience.required)}`,
        `${emoji("health")} **${num(locale, player.health.current)}**/${num(locale, player.health.max)}`,
        `${emoji("gold")} **${num(locale, player.gold)}**`,
        // La banque n'est pas une condition d'accès au profil : verrouillée, elle est simplement indiquée comme telle.
        `${emoji("bank")} ${player.bankUnlocked ? `**${num(locale, player.bankGold)}**` : `*${t(locale, "profile.bankLocked")}*`}`,
        `${emoji("location")} ${locationName(locale, player.location)}`,
    ].join(SEP);

    const points = attributes.points > 0 ? `${SEP}${emoji("skillPoints")} **${attributes.points}**` : "";
    const stats =
        `**${t(locale, "profile.attributes")} :** ` +
        [
            `${emoji("strength")} **${attributes.strength}**`,
            `${emoji("agility")} **${attributes.agility}**`,
            `${emoji("intelligence")} **${attributes.intelligence}**`,
            `${emoji("defense")} **${attributes.defense}**`,
        ].join(SEP) +
        points;

    const identity = [
        playerClass ? contentName(locale, "class", playerClass.id, playerClass.name) : player.classId,
        status,
        player.marriage.isMarried()
            ? `${emoji("marriage")} <@${userIdOf(player.marriage.getPartnerId())}>`
            : null,
    ]
        .filter(Boolean)
        .join(SEP);

    const kills = player.bestiary.list().reduce((sum, entry) => sum + entry.kills, 0);
    const progression = [
        `${emoji("bestiary")} ${progress.discovered}/${progress.total}`,
        `${emoji("achievement")} ${world.achievements.getUnlocked(player.id).length}/${world.achievements.list().length}`,
        `${emoji("victory")} ${num(locale, kills)}`,
    ].join(SEP);

    const jobs = player.jobs
        .listProgress()
        .map((job) => `${emoji(jobIconOf(job.jobId))} ${t(locale, "common.levelShort")} ${job.level}`)
        .join(SEP);

    const bonuses = [
        modifiers.xpMultiplier !== 1 ? t(locale, "profile.xpMultiplier", { value: modifiers.xpMultiplier }) : null,
        modifiers.luckPercent !== 0 ? t(locale, "profile.luck", { value: modifiers.luckPercent }) : null,
        modifiers.critRateBonus !== 0 ? t(locale, "profile.crit", { value: modifiers.critRateBonus }) : null,
        ...player.effects
            .list()
            .map((e) => `${contentName(locale, "effect", e.effectId, e.name)} (${formatDuration(e.remainingMs)})`),
    ].filter(Boolean);

    const text = [header, vitals, stats, identity, progression, jobs || null, bonuses.length > 0 ? bonuses.join(SEP) : null]
        .filter((line): line is string => Boolean(line))
        .join("\n");

    const container = new ContainerBuilder().addSectionComponents(
        new SectionBuilder()
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(owner.displayAvatarURL()))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(clip(text))),
    );
    return container;
}
