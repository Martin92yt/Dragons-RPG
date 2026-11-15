import { log } from "../core/logger";
import {
    ApplicationIntegrationType,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ContainerBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    InteractionContextType,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SlashCommandBuilder,
    TextDisplayBuilder,
    type AutocompleteInteraction,
    type ChatInputCommandInteraction,
} from "discord.js";
import { Gifuto, type Gif } from "gifuto.js";
import { BOT } from "../bot.config";
import { emoji, emojiData, withEmoji } from "../core/emojis";
import { num } from "../core/format";
import { edit, panel, reply, withButtons } from "../core/ui";
import { describe, localizations, named, resolveLocale, t, type Locale } from "../i18n";

const gifuto = new Gifuto({ apiKey: process.env.Gifuto! });

/** Fonctionne partout (serveur, messages privés, installation utilisateur) et sans personnage. */
export const bypassGuard = true;

export const data = describe(named(new SlashCommandBuilder(), "anime"), "anime.desc")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addStringOption((o) => {
        const loc = localizations("anime.opt.tag");
        return o
            .setName("tag")
            .setDescription(loc["en-US"])
            .setDescriptionLocalizations({ fr: loc.fr })
            .setRequired(false)
            .setAutocomplete(true);
    })
    .addUserOption((o) => {
        const loc = localizations("anime.opt.member");
        return o
            .setName("member")
            .setNameLocalizations({ fr: "membre" })
            .setDescription(loc["en-US"])
            .setDescriptionLocalizations({ fr: loc.fr })
            .setRequired(false);
    });

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const typed = interaction.options.getFocused().toLowerCase();
    try {
        const tags = await gifuto.getTags();
        const choices = tags
            .filter((tag) => tag.label.toLowerCase().includes(typed) || tag.slug.toLowerCase().includes(typed))
            .slice(0, 25)
            .map((tag) => ({
                name: t(locale, "anime.tagCount", { label: tag.label, count: tag.count }).slice(0, 100),
                value: tag.slug,
            }));
        await interaction.respond(choices);
    } catch (error) {
        log.anime.error("autocomplete", error);
        await interaction.respond([]).catch(() => undefined);
    }
}

/** Transforme une URL Tenor standard en URL directe c.tenor.com. */
function transformTenorUrl(url: string): string {
    const match = url.match(/https?:\/\/(?:media\d*|c)\.tenor\.com\/(?:m\/)?([a-zA-Z0-9_-]+)\/.*/i);
    return match?.[1] ? `https://c.tenor.com/${match[1]}/tenor.gif` : url;
}

function infoLines(locale: Locale, gif: Gif): string {
    const tags = [gif.tags.primary, ...gif.tags.secondary].filter((tag): tag is string => Boolean(tag));
    const lines = [
        gif.anime ? t(locale, "anime.anime", { anime: gif.anime }) : null,
        gif.characters.length > 0 ? t(locale, "anime.characters", { characters: gif.characters.join(", ") }) : null,
        gif.episode ? t(locale, "anime.episode", { episode: gif.episode }) : null,
        tags.length > 0 ? t(locale, "anime.tags", { tags: tags.map((tag) => `\`${tag}\``).join(" ") }) : null,
    ].filter((line): line is string => line !== null);
    return lines.join("\n");
}

/**
 * Mise en page : titre, image pleine largeur, infos, puis le bouton seul sur sa rangée tout en bas.
 * (Un bouton placé à côté du texte, en `Section`, ferait rétrécir l'image : on évite.)
 */
function view(locale: Locale, gif: Gif, header: string, disabled: boolean, buttonId: string) {
    const info = infoLines(locale, gif);
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(header))
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(transformTenorUrl(gif.url))),
        );
    if (info) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(info));
    container
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${t(locale, "anime.hits", { hits: num(locale, gif.hits) })} • ${emoji("share02")} ${t(locale, "anime.credit", { url: BOT.links.gifuto })}`,
            ),
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    return withButtons(
        container,
        new ButtonBuilder()
            .setCustomId(buttonId)
            .setLabel(t(locale, "anime.another"))
            .setEmoji(emojiData("shuffle"))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
    );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = resolveLocale(interaction.locale);
    const tag = interaction.options.getString("tag");
    const target = interaction.options.getUser("member");
    const buttonId = `anime:again:${interaction.id}`;

    const header = withEmoji(
        "friends",
        target
            ? t(locale, "anime.with", { user: `${interaction.user}`, target: `${target}` })
            : t(locale, "anime.self", { user: `${interaction.user}` }),
    );

    const fetchGif = () => gifuto.getRandomGif({ noRepeat: interaction.channelId ?? interaction.user.id, ...(tag ? { tag } : {}) });

    let gif: Gif;
    try {
        gif = await fetchGif();
    } catch (error) {
        log.anime.error(error);
        await interaction.reply(
            reply(panel(withEmoji("error", t(locale, tag ? "anime.noResult" : "anime.empty"))), { ephemeral: true }),
        );
        return;
    }

    await interaction.reply({
        ...reply(view(locale, gif, header, false, buttonId)),
        allowedMentions: { users: target ? [target.id] : [] },
    });
    const message = await interaction.fetchReply();

    // Bouton « Un autre » : réservé à l'auteur, actif 2 minutes.
    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120_000 });
    collector.on("collect", async (button) => {
        if (button.user.id !== interaction.user.id) {
            await button.reply(reply(panel(withEmoji("error", t(resolveLocale(button.locale), "anime.notYours"))), { ephemeral: true })).catch(() => undefined);
            return;
        }
        try {
            gif = await fetchGif();
            await button.update(edit(view(locale, gif, header, false, buttonId)));
        } catch (error) {
            log.anime.error("reroll", error);
            await button.reply(reply(panel(withEmoji("error", t(locale, "anime.error"))), { ephemeral: true })).catch(() => undefined);
        }
    });
    collector.on("end", () => {
        interaction.editReply(edit(view(locale, gif, header, true, buttonId)) as never).catch(() => undefined);
    });
}
