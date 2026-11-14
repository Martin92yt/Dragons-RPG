import type { AutocompleteInteraction } from "discord.js";

export interface Suggestion {
    readonly name: string;
    readonly value: string;
}

/** Répond à une autocomplétion : filtre sur le texte saisi, 25 résultats maximum, noms tronqués à 100 caractères. */
export async function suggest(
    interaction: AutocompleteInteraction,
    suggestions: readonly Suggestion[],
): Promise<void> {
    const typed = interaction.options.getFocused().toLowerCase().trim();
    const matches = suggestions
        .filter((s) => typed === "" || s.name.toLowerCase().includes(typed) || s.value.toLowerCase().includes(typed))
        .slice(0, 25)
        .map((s) => ({ name: s.name.slice(0, 100), value: s.value.slice(0, 100) }));
    await interaction.respond(matches).catch(() => undefined);
}
