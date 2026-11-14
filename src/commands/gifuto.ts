import {
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ButtonBuilder,
    ButtonStyle,
    SectionBuilder,
    ContainerBuilder,
    SlashCommandBuilder,
    MessageFlags,
    ApplicationIntegrationType,
    InteractionContextType,
    type ChatInputCommandInteraction,
    type AutocompleteInteraction,
} from "discord.js";
import { Gifuto } from "gifuto.js";

const gifuto = new Gifuto({ apiKey: process.env.Gifuto! });

export const data = new SlashCommandBuilder()
    .setName("anime")
    .setDescription("Commande d'anime aléatoire")
    // Permet l'installation sur un serveur (Guild) et/ou sur le profil utilisateur (User)
    .setIntegrationTypes(
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall
    )
    // Définit où la commande peut être exécutée (Serveurs, Messages privés, etc.)
    .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
    )
    .addStringOption((o) =>
        o.setName("tag")
            .setDescription("Tag, anime ou personnage optionnel")
            .setRequired(false)
            .setAutocomplete(true),
    )
    .addUserOption((o) =>
        o.setName("member")
            .setDescription("Membre ciblé (optionnel)")
            .setRequired(false),
    );

/**
 * Gère les suggestions d'autocomplétion pour l'option "tag"
 */
export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();

    try {
        const tags = await gifuto.getTags();
        
        if (!Array.isArray(tags)) {
            await interaction.respond([]);
            return;
        }

        const filteredTags = tags.filter((item: any) => {
            const label = item?.label?.toLowerCase() || "";
            const slug = item?.slug?.toLowerCase() || "";
            return label.includes(focusedValue) || slug.includes(focusedValue);
        });

        const choices = filteredTags.slice(0, 25).map((item: any) => ({
            name: `${item.label} (${item.count} GIFs)`,
            value: item.slug,
        }));

        await interaction.respond(choices);
    } catch (error) {
        console.error("Erreur lors de l'autocomplétion :", error);
        await interaction.respond([]);
    }
}

/**
 * Transforme une URL Tenor standard en URL directe /c.tenor.com
 */
function transformTenorUrl(url: string): string {
    const match = url.match(/https?:\/\/(?:media\d*|c)\.tenor\.com\/(?:m\/)?([a-zA-Z0-9_-]+)\/.*/i);
    if (match && match[1]) {
        return `https://c.tenor.com/${match[1]}/tenor.gif`;
    }
    return url;
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const tag = interaction.options.getString("tag");
    const target = interaction.options.getUser("member");

    try {
        const fetchOptions: any = {
            noRepeat: interaction.channelId,
        };

        if (tag) {
            fetchOptions.tag = tag;
        }

        const gif = await gifuto.getRandomGif(fetchOptions);
        const gifUrl = transformTenorUrl(gif.url);

        const actionText = target
            ? `<:friends:1571117775672578119> ${interaction.user} interagit avec ${target}.`
            : `<:friends:1571117775672578119> ${interaction.user} a demandé un GIF.`;

        const components = [
            new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(actionText),
                )
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(gifUrl),
                    ),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("-# *From [Gifuto <:share02:1571118009265684650>](https://gifuto.vercel.app)*"),
                ),
        ];

        await interaction.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: components,
        });
    } catch (e) {
        console.log(e);
        const components = [
            new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "<:exclamation:1570820851014705264> No GIFs available right now.",
                ),
            ),
        ];

        await interaction.reply({
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
            components: components,
        });
    }
}