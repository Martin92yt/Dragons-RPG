import type { Collection, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";
import type World from "dragons-of-legends.js";

declare global {
    interface BotCommand {
        data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
        execute(interaction: ChatInputCommandInteraction): Promise<void>;
        autocomplete?(interaction: AutocompleteInteraction): Promise<void> | void;
        /**
         * Par défaut, toute commande passe par le guard (mort, combat, voyage, job).
         * `true` réserve l'exemption aux commandes purement informatives (`/about`, `/info`).
         */
        bypassGuard?: boolean;
    }
}

declare module "discord.js" {
    interface Client {
        commands: Collection<string, BotCommand>;
        RPG: World;
    }
}

export {};
