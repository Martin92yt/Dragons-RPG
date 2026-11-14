import type { LocaleString } from "discord.js";
import { fr, type MessageKey } from "./locales/fr";
import { enUS } from "./locales/en-US";

export type Locale = "fr" | "en-US";
export type { MessageKey };

export const DEFAULT_LOCALE: Locale = "en-US";
export const SUPPORTED_LOCALES: readonly Locale[] = ["fr", "en-US"];

const CATALOGS: Record<Locale, Record<MessageKey, string>> = { fr, "en-US": enUS };

/**
 * Convertit une locale Discord (`fr`, `en-US`, `en-GB`...) en locale supportée par le bot.
 * Toute variante de français donne `fr` ; tout le reste retombe sur l'anglais américain.
 */
export function resolveLocale(discordLocale?: LocaleString | string | null): Locale {
    if (discordLocale && discordLocale.toLowerCase().startsWith("fr")) return "fr";
    return DEFAULT_LOCALE;
}

/** Traduit une clé et remplace les variables `{nom}`. Une variable absente est laissée telle quelle. */
export function t(
    locale: Locale,
    key: MessageKey,
    vars: Record<string, string | number> = {},
): string {
    const template = CATALOGS[locale][key] ?? CATALOGS[DEFAULT_LOCALE][key];
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
    );
}

/** Localisations Discord (nom/description de commande) à partir d'une clé. */
export function localizations(key: MessageKey): { fr: string; "en-US": string } {
    return { fr: t("fr", key), "en-US": t("en-US", key) };
}

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
