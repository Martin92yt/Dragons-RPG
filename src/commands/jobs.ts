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
    .setName("jobs")
    .setDescription("Système de métiers")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("fish")
            .setDescription("Partir à la pêche")
            .addStringOption((option) =>
                option
                    .setName("type")
                    .setDescription("Type de session de pêche")
                    .setRequired(true)
                    .addChoices(
                        { name: "Long", value: "fish" },
                        { name: "Short", value: "fish" }
                    )
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.user;
    const type = interaction.options.getString("type", true); // "long" ou "short"

    // Récupération / Création du joueur
    const player = await interaction.client.RPG.players.ensure({
        id: `${interaction.guildId}_${targetUser.id}`,
        name: targetUser.displayName,
        playerClass: PlayerClass.Explorer,
    });

    // Exécution de l'action de pêche avec le type sélectionné
    const fishing = await player.jobs.perform("fishing", type);

    // Formatage du butin récolté
    const lootDisplay = fishing?.loot && fishing.loot.length > 0
        ? fishing.loot.map(({ item, quantity }) => `• **${quantity}x** ${item.name}`).join("\n")
        : "Rien attrapé cette fois-ci...";

    const fishingText = [
        `## <:fishhook:1570852266292936834> __Résultat de Pêche (${type.toUpperCase()})__`,
        `* ${targetUser.displayName} a terminé sa session de pêche.`,
        ``,
        `**Butin récolté :**`,
        lootDisplay
    ].join("\n");

    const components = [
        new ContainerBuilder()
            .addSectionComponents(
                new SectionBuilder()
                    .setThumbnailAccessory(
                        new ThumbnailBuilder()
                            .setURL(targetUser.displayAvatarURL())
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(fishingText),
                    ),
            ),
    ];

    await interaction.reply({
        flags: [MessageFlags.IsComponentsV2],
        components: components,
    });
}