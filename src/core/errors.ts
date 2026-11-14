import { formatIn, t, type Locale, type MessageKey } from "../i18n";
import { num } from "./format";

type Fields = Record<string, unknown>;

type Mapper = (error: Fields, locale: Locale) => { key: MessageKey; vars?: Record<string, string | number> };

const n = (value: unknown): number => (typeof value === "number" ? value : 0);

/**
 * Erreurs de la librairie que l'on sait expliquer au joueur, indexées par nom de classe.
 * Toute erreur absente de cette table est traitée comme un bug (log + message générique).
 */
const MAPPERS: Record<string, Mapper> = {
    PlayerDeadError: () => ({ key: "err.dead" }),
    JobCooldownError: (e, l) => ({ key: "err.jobCooldown", vars: { time: formatIn(l, n(e.remainingMs)) } }),
    JobLevelTooLowError: (e) => ({
        key: "err.jobLevel",
        vars: { required: n(e.requiredLevel), current: n(e.currentLevel) },
    }),
    JobToolRequiredError: () => ({ key: "err.jobTool" }),
    InvalidJobToolError: () => ({ key: "err.jobToolInvalid" }),
    ShopLevelTooLowError: (e) => ({
        key: "err.shopLevel",
        vars: { required: n(e.requiredLevel), current: n(e.currentLevel) },
    }),
    ShopInsufficientGoldError: (e, l) => ({
        key: "err.shopGold",
        vars: { required: num(l, n(e.required)), available: num(l, n(e.available)) },
    }),
    ShopInsufficientItemsError: (e) => ({
        key: "err.shopItems",
        vars: { requested: n(e.requested), available: n(e.available) },
    }),
    ShopItemUnavailableError: () => ({ key: "err.shopUnavailable" }),
    InvalidShopQuantityError: () => ({ key: "err.quantity" }),
    BankLockedError: () => ({ key: "err.bankLocked" }),
    BankLimitReachedError: (e, l) => ({ key: "err.bankLimit", vars: { limit: num(l, n(e.limit)) } }),
    InsufficientFundsError: () => ({ key: "err.bankFunds" }),
    InvalidAmountError: () => ({ key: "err.bankAmount" }),
    BankCapacityError: (e) => ({
        key: "err.vaultCapacity",
        vars: { required: n(e.requiredSlots), capacity: n(e.capacity) },
    }),
    BankItemNotFoundError: (e) => ({
        key: "err.vaultItem",
        vars: { requested: n(e.requested), available: n(e.available) },
    }),
    NoAttributePointsError: () => ({ key: "err.noPoints" }),
    PlayerAlreadyTravellingError: () => ({ key: "err.alreadyTravelling" }),
    MoveInCombatError: () => ({ key: "err.moveInCombat" }),
    PlayerAlreadyInCombatError: () => ({ key: "err.alreadyInCombat" }),
    PlayerNotInCombatError: () => ({ key: "err.notInCombat" }),
    SelfCombatError: () => ({ key: "err.selfCombat" }),
    UnknownLocationError: () => ({ key: "err.unknownLocation" }),
    NoEnemyAvailableError: () => ({ key: "err.noEnemy" }),
    InvalidPartnerError: () => ({ key: "err.invalidPartner" }),
    TitleNotOwnedError: () => ({ key: "err.titleNotOwned" }),
    UnknownTitleError: () => ({ key: "err.unknownTitle" }),
    PlayerAlreadyExistsError: () => ({ key: "err.alreadyExists" }),
    UnknownPlayerClassError: () => ({ key: "err.unknownClass" }),
    UnknownJobError: () => ({ key: "err.unknownEntry" }),
    UnknownJobActionError: () => ({ key: "err.unknownEntry" }),
    UnknownRegistryEntryError: () => ({ key: "err.unknownEntry" }),
    UnknownAchievementError: () => ({ key: "err.unknownAchievement" }),
};

/**
 * Explique une erreur de la librairie au joueur.
 * @returns le message traduit, ou `null` si l'erreur n'est pas une erreur « métier » connue.
 */
export function describeError(locale: Locale, error: unknown): string | null {
    if (!(error instanceof Error)) return null;
    const mapper = MAPPERS[error.constructor.name];
    if (!mapper) return null;
    const { key, vars } = mapper(error as unknown as Fields, locale);
    return t(locale, key, vars);
}
