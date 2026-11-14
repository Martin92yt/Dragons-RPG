import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SectionBuilder,
    ContainerBuilder,
    MessageFlags,
} from "discord.js";
import { PlayerClass } from 'dragons-of-legends.js';

export const data = new SlashCommandBuilder()
    .setName("profil")
    .setDescription("Affiche ton profil d'aventurier ou celui d'un autre joueur.")
    .addUserOption((o) =>
        o.setName("joueur")
            .setDescription("Le joueur dont tu souhaites consulter le profil")
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser("joueur") ?? interaction.user;

    const player = await interaction.client.RPG.players.ensure({
        id: `${interaction.guildId}_${targetUser.id}`,
        name: targetUser.displayName,
        playerClass: PlayerClass.Explorer,
    });

    if (!player) throw new Error(`Impossible de charger ou créer le joueur ${targetUser.id}.`);

    // Préparation des lignes optionnelles
    const skillPointsDisplay = player.attributes?.points 
        ? `  (**${player.attributes.points}** <:skillpoints:1571115125694267402>)` 
        : "";
    const marriageDisplay = player.marriage?.getPartnerId() 
        ? `Marié(e) avec <@${player.marriage.getPartnerId().split("_").pop()}>` 
        : null;

    // Construction sobre et aérée
    const profileText = [
        `## <:user:1571117804013355111> __${player.titles.getDisplayName()}__`,
        `<:level:1571115075417145425> **${player.level}**  •  **${player.experience.current}** <:experiencepoints:1571115067359891557>  •  **${player.health.current}** <:healthpoints:1571115068752404550>  •  <:ingot:1571115239238537377> **${player.gold}**  •  <:location:1571118000898187394> ${player.location ?? "Inconnu"}`,
        `**Attributs :** <:broadsword:1571115599344435333> **${player.attributes?.strength ?? 0}**  •  <:warriorbootslv1:1571115538720096336> **${player.attributes?.agility ?? 0}**  •  <:light:1571115221513142325> **${player.attributes?.intelligence ?? 0}**  •  <:shield:1571115546827821056> **${player.attributes?.defense ?? 0}**` + skillPointsDisplay,
        marriageDisplay,
    ].filter(Boolean).join("\n");

    const components = [
        new ContainerBuilder()
            .addSectionComponents(
                new SectionBuilder()
                    .setThumbnailAccessory(
                        new ThumbnailBuilder()
                            .setURL(targetUser.displayAvatarURL())
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(profileText),
                    ),
            ),
    ];

    await interaction.reply({
        flags: [MessageFlags.IsComponentsV2],
        components: components,
    });
}