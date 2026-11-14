import type { LocaleString, LocalizationMap } from "discord.js";
import type { Catalog } from "./define";
import { core } from "./messages/core";
import { errors } from "./messages/errors";
import { options } from "./messages/options";
import { character } from "./messages/character";
import { profile } from "./messages/profile";
import { inventory } from "./messages/inventory";
import { economy } from "./messages/economy";
import { progression } from "./messages/progression";
import { adventure } from "./messages/adventure";
import { social } from "./messages/social";
import { admin } from "./messages/admin";
import { anime } from "./messages/anime";

export type Locale = "fr" | "en-US";

export const DEFAULT_LOCALE: Locale = "en-US";
export const SUPPORTED_LOCALES: readonly Locale[] = ["fr", "en-US"];

const MODULES = [core, errors, options, character, profile, inventory, economy, progression, adventure, social, admin, anime] as const;

type KeysOf<M> = M extends Catalog<infer K> ? K : never;
export type MessageKey = KeysOf<(typeof MODULES)[number]>;

const CATALOGS: Record<Locale, Record<string, string>> = { fr: {}, "en-US": {} };
for (const module of MODULES) {
    Object.assign(CATALOGS.fr, module.fr);
    Object.assign(CATALOGS["en-US"], module["en-US"]);
}

/**
 * Convertit une locale Discord (`fr`, `en-US`, `en-GB`...) en locale supportée par le bot.
 * Toute variante de français donne `fr` ; tout le reste retombe sur l'anglais américain.
 */
export function resolveLocale(discordLocale?: LocaleString | string | null): Locale {
    if (discordLocale && discordLocale.toLowerCase().startsWith("fr")) return "fr";
    return DEFAULT_LOCALE;
}

/** Traduit une clé et remplace les variables `{nom}`. Une variable absente est laissée telle quelle. */
export function t(locale: Locale, key: MessageKey, vars: Record<string, string | number> = {}): string {
    const template = CATALOGS[locale][key] ?? CATALOGS[DEFAULT_LOCALE][key] ?? key;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
    );
}

/** Localisations Discord (nom/description de commande) à partir d'une clé. */
export function localizations(key: MessageKey): { fr: string; "en-US": string } {
    return { fr: t("fr", key), "en-US": t("en-US", key) };
}

// ── Helpers de déclaration de commandes ───────────────────────────────────────

interface Nameable {
    setName(name: string): unknown;
    setNameLocalizations(localizations: LocalizationMap | null): unknown;
}

interface Describable {
    setDescription(description: string): unknown;
    setDescriptionLocalizations(localizations: LocalizationMap | null): unknown;
}

/** Donne un nom anglais (référence) et, si fourni, un nom français à une commande, sous-commande ou option. */
export function named<T extends Nameable>(builder: T, en: string, fr?: string): T {
    builder.setName(en);
    if (fr) builder.setNameLocalizations({ fr });
    return builder;
}

/** Donne une description anglaise (référence) et française à partir d'une clé de message. */
export function describe<T extends Describable>(builder: T, key: MessageKey): T {
    builder.setDescription(t("en-US", key));
    builder.setDescriptionLocalizations({ fr: t("fr", key) });
    return builder;
}

/** Choix de liste localisé : `{ name, name_localizations, value }`. */
export function choice<V extends string | number>(key: MessageKey, value: V) {
    return {
        name: t("en-US", key),
        name_localizations: { fr: t("fr", key) },
        value,
    };
}

// ── Durées ────────────────────────────────────────────────────────────────────

/** Durée lisible : `42 s`, `3 min 05 s`, `2 h 10 min`. */
export function formatDuration(ms: number): string {
    const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
    if (m > 0) return `${m} min ${String(s).padStart(2, "0")} s`;
    return `${s} s`;
}

/** Formate « dans X » à partir d'un délai en ms. */
export function formatIn(locale: Locale, ms: number): string {
    if (ms <= 1000) return t(locale, "time.soon");
    return t(locale, "time.in", { value: formatDuration(ms) });
}
