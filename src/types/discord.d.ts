import type {
    Collection,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
    ChatInputCommandInteraction,
    AutocompleteInteraction,
} from "discord.js";
import type World from "dragons-of-legends.js";

declare global {
    interface BotCommand {
        data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
        execute(interaction: ChatInputCommandInteraction): Promise<void>;
        autocomplete?(interaction: AutocompleteInteraction): Promise<void> | void;
        /**
         * Par défaut, toute commande passe par le guard (mort, combat, voyage, job).
         * `true` réserve l'exemption aux commandes qui ne concernent pas le personnage
         * (`/about`, `/info`, `/admin`).
         */
        bypassGuard?: boolean;
        /**
         * États bloquants tolérés pour cette invocation précise.
         * Sert aux seules actions qui sont la sortie de l'état : attaquer ou fuir pendant un combat.
         */
        allowDuring?(interaction: ChatInputCommandInteraction): readonly ("dead" | "combat" | "travel" | "jobs")[];
    }
}

declare module "discord.js" {
    interface Client {
        commands: Collection<string, BotCommand>;
        RPG: World;
    }
}

export {};
