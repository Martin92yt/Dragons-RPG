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

    await player.titles.grant("novice_adventurer")
    // await player.titles.equip("novice_adventurer")
    // Préparation des lignes optionnelles
    const skillPointsDisplay = player.attributes?.points 
        ? `  (**${player.attributes.points}** <:skillpoints:1570840939377721355>)` 
        : "";
    const marriageDisplay = player.marriage?.partnerId 
        ? `Marié(e) avec <@${player.marriage.partnerId}>` 
        : null;

    // Construction sobre et aérée
    const profileText = [
        `## <:user:1570841944500994249> __${player.titles.getDisplayName()}__`,
        `<:level:1570840937859387465> **${player.level}**  •  **${player.experience.current}** <:experiencepoints:1570840935376355542>  •  **${player.health.current}** <:healthpoints:1570840936680792064>  •  <:ingot:1570840429296095495> **${player.goldBalance}**  •  <:location:1570844436689068174> ${player.location ?? "Inconnu"}`,
        `**Attributs :** <:broadsword:1570846340546826341> **${player.attributes?.strength ?? 0}**  •  <:warriorbootslv1:1570846338055409815> **${player.attributes?.agility ?? 0}**  •  <:light:1570846476597203045> **${player.attributes?.intelligence ?? 0}**  •  <:shield:1570846339217100950> **${player.attributes?.defense ?? 0}**` + skillPointsDisplay,
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