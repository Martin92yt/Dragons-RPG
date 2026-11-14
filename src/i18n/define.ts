/**
 * Un module de messages déclare ses clés une seule fois et doit les fournir dans les deux langues :
 * TypeScript refuse de compiler si une clé manque dans l'une des deux.
 */
export interface Catalog<K extends string> {
    readonly fr: Readonly<Record<K, string>>;
    readonly "en-US": Readonly<Record<K, string>>;
}

export function defineMessages<const K extends string>(catalog: Catalog<K>): Catalog<K> {
    return catalog;
}
