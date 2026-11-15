/** Largeur visée pour un texte courant sur Discord (hors emojis) : lisible sur mobile comme sur ordinateur. */
export const LINE_WIDTH = 72;

/** Longueur « visible » d'un mot : une mention de commande ou un emoji custom compte pour très peu. */
function visibleLength(word: string): number {
    return word
        .replace(/<\/[^:>]+:\d+>/g, "/commande")
        .replace(/<a?:\w+:\d+>/g, "ee")
        .replace(/\*\*|__|`/g, "").length;
}

/**
 * Coupe un texte en lignes d'environ `width` caractères sans casser les mots ni les mentions de commandes.
 * Les sauts de ligne existants sont conservés ; chaque paragraphe est coupé séparément.
 */
export function wrap(text: string, width = LINE_WIDTH): string {
    return text
        .split("\n")
        .map((paragraph) => {
            const lines: string[] = [];
            let current = "";
            let length = 0;
            // Les mentions `</a b:123>` contiennent une espace : on les garde d'un bloc.
            for (const word of paragraph.match(/<\/[^>]+>|\S+/g) ?? []) {
                const size = visibleLength(word);
                if (current && length + 1 + size > width) {
                    lines.push(current);
                    current = word;
                    length = size;
                } else {
                    current = current ? `${current} ${word}` : word;
                    length += (current === word ? 0 : 1) + size;
                }
            }
            lines.push(current);
            return lines.join("\n");
        })
        .join("\n");
}
