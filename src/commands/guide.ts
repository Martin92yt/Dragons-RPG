import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { describe, named } from "../i18n";
import { showStart } from "./start";

export const data = describe(named(new SlashCommandBuilder(), "guide"), "guide.desc");

/** Lecture seule, sans lien avec l'état du personnage : toujours accessible. */
export const bypassGuard = true;

/** `/guide` et `/start` partagent le même parcours : création si besoin, puis le guide. */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await showStart(interaction);
}
