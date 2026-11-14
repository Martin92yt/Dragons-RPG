import type { Locale } from "./index";

/**
 * Traductions françaises du contenu officiel de la librairie (qui est en anglais).
 *
 * - Anglais : on affiche directement le texte de la librairie.
 * - Français : on cherche ici par identifiant, et on retombe sur le texte de la librairie si l'entrée n'existe pas
 *   (contenu personnalisé, butins d'ennemis non catalogués...).
 *
 * Format : `identifiant: [nom, description]`.
 */
type Entry = readonly [name: string, description?: string];

const FR = {
    item: {
        greater_health_potion: ["Grande potion de soin", "Rend instantanément 90 points de vie."],
        focus_elixir: ["Élixir de concentration", "Augmente le taux critique de 15 % pendant 3 minutes."],
        fortune_elixir: ["Élixir de fortune", "Augmente la chance de 25 % pendant 10 minutes."],
        health_potion: ["Potion de soin", "Restaure instantanément 30 points de vie."],
        rusty_sword: ["Épée rouillée", "Une lame usée, mieux que les mains nues."],
        iron_sword: ["Épée de fer", "Une lame de fer fiable."],
        steel_sword: ["Épée d'acier", "Une lame d'acier bien équilibrée."],
        regeneration_potion: ["Potion de régénération", "Restaure 10 points de vie par seconde pendant 60 secondes."],
        xp_boost_potion: ["Potion d'expérience", "Double l'expérience gagnée pendant 15 minutes."],
        luck_amulet: ["Amulette de chance", "+10 % de chance : meilleur butin et drops plus rares."],
        xp_amulet: ["Amulette de sagesse", "+10 % d'expérience gagnée tant qu'elle est portée."],
        critical_amulet: ["Amulette de précision", "+5 % de chances de coup critique."],
        pouch_common: ["Pochette commune", "Une pochette mystère : ouvre-la pour découvrir son contenu."],
        pouch_rare: ["Pochette rare", "Une pochette mystère : ouvre-la pour découvrir son contenu."],
        pouch_epic: ["Pochette épique", "Une pochette mystère : ouvre-la pour découvrir son contenu."],
        pouch_legendary: ["Pochette légendaire", "Une pochette mystère : ouvre-la pour découvrir son contenu."],
    },
    lootbox: {
        pouch_common: ["Pochette commune"],
        pouch_rare: ["Pochette rare"],
        pouch_epic: ["Pochette épique"],
        pouch_legendary: ["Pochette légendaire"],
    },
    title: {
        apex_predator: ["Superprédateur", "Vaincre mille monstres."],
        eternal_champion: ["Champion éternel", "Atteindre le sommet de la légende."],
        realm_legend: ["Légende du royaume", "Atteindre le niveau 50."],
        boss_hunter: ["Chasseur de boss", "Vaincre vingt-cinq boss."],
        demon_bane: ["Fléau des démons", "Vaincre un Seigneur démon."],
        dragon_slayer: ["Tueur de dragons", "Vaincre un Dragon ancien."],
        lich_breaker: ["Briseur de liche", "Vaincre une Liche suprême."],
        master: ["Maître", "Atteindre le niveau 40."],
        gilded_purse: ["Bourse dorée", "Amasser une fortune."],
        monster_hunter: ["Chasseur de monstres", "Vaincre deux cents monstres."],
        seasoned_traveller: ["Voyageur aguerri", "Traverser le monde, route après route."],
        treasure_hunter: ["Chasseur de trésors", "Ouvrir cinquante pochettes mystère."],
        veteran: ["Vétéran", "Atteindre le niveau 20."],
        bandit_bane: ["Fléau des bandits", "Débarrasser les routes des bandits."],
        goblin_hunter: ["Chasseur de gobelins", "Vaincre un grand nombre de gobelins."],
        lucky_one: ["Veinard", "Ouvrir dix pochettes mystère."],
        potion_enthusiast: ["Amateur de potions", "Boire beaucoup de potions."],
        savvy_shopper: ["Acheteur avisé", "Faire de nombreux achats dans les boutiques."],
        slime_slayer: ["Tueur de slimes", "Vaincre un grand nombre de slimes."],
        apprentice: ["Apprenti", "Atteindre le niveau 5."],
        first_blood: ["Premier sang", "Vaincre ton premier monstre."],
        novice_adventurer: ["Aventurier novice", "Toute légende commence quelque part."],
        pouch_opener: ["Ouvreur de pochettes", "Ouvrir ta première pochette mystère."],
    },
    achievement: {
        first_blood: ["Premier sang", "Vaincre ton premier monstre."],
        pouch_opener: ["Que contient-elle ?", "Ouvrir ta première pochette mystère."],
        level_5: ["Apprenti", "Atteindre le niveau 5."],
        slime_slayer: ["Tueur de slimes", "Vaincre 50 slimes."],
        goblin_hunter: ["Chasseur de gobelins", "Vaincre 50 gobelins."],
        bandit_bane: ["Fléau des bandits", "Vaincre 50 bandits."],
        savvy_shopper: ["Acheteur avisé", "Faire 10 achats dans les boutiques."],
        potion_enthusiast: ["Amateur de potions", "Utiliser 25 consommables."],
        lucky_one: ["Veinard", "Ouvrir 10 pochettes mystère."],
        level_10: ["Héros montant", "Atteindre le niveau 10."],
        seasoned_traveller: ["Voyageur aguerri", "Effectuer 100 voyages."],
        gilded_purse: ["Bourse dorée", "Porter 10 000 pièces d'or à la fois."],
        level_20: ["Vétéran", "Atteindre le niveau 20."],
        monster_hunter: ["Chasseur de monstres", "Vaincre 200 monstres."],
        treasure_hunter: ["Chasseur de trésors", "Ouvrir 50 pochettes mystère."],
        lich_breaker: ["Briseur de liche", "Vaincre une Liche suprême."],
        demon_bane: ["Fléau des démons", "Vaincre un Seigneur démon."],
        dragon_slayer: ["Tueur de dragons", "Vaincre un Dragon ancien."],
        boss_hunter: ["Chasseur de boss", "Vaincre 25 boss."],
        level_40: ["Maître", "Atteindre le niveau 40."],
        level_50: ["Légende du royaume", "Atteindre le niveau 50."],
        apex_predator: ["Superprédateur", "Vaincre 1 000 monstres."],
        eternal_champion: [
            "Champion éternel",
            "Atteindre le niveau 50, vaincre 100 boss et ouvrir 100 pochettes mystère.",
        ],
    },
    achievementCategory: {
        combat: ["Combat"],
        loot: ["Butin"],
        progression: ["Progression"],
        economy: ["Économie"],
        consumables: ["Consommables"],
        exploration: ["Exploration"],
        boss: ["Boss"],
    },
    effect: {
        focus: ["Concentration", "Augmente le taux critique pendant 3 minutes."],
        fortune: ["Fortune", "Augmente la chance pendant 10 minutes."],
        regeneration: ["Régénération", "Restaure 10 points de vie chaque seconde pendant 60 secondes."],
        xp_boost: ["Boost d'expérience", "Double l'expérience gagnée pendant 15 minutes."],
    },
    job: {
        fishing: ["Pêche", "Lance ta ligne et vois ce qui mord."],
        mining: ["Mine", "Creuse à la recherche de minerai, du modeste charbon au titane étincelant."],
        woodcutting: ["Bûcheronnage", "Abats des arbres et récolte ce que la forêt offre."],
    },
    jobAction: {
        fish: ["Pêcher", "Lance une ligne dans l'eau la plus proche."],
        mine: ["Miner", "Frappe la veine la plus proche avec ta pioche."],
        deep_mine: ["Mine profonde", "Descends dans les galeries profondes. Nécessite une pioche."],
        chop: ["Abattre", "Abats un arbre proche."],
        gather_branches: ["Ramasser des branches", "Collecte branches, écorce et résine sans abattre d'arbre."],
    },
    class: {
        warrior: ["Guerrier", "Un combattant robuste qui compte sur sa force brute."],
        explorer: ["Explorateur", "Un voyageur polyvalent, vif sur ses jambes."],
        rogue: ["Voleur", "Un tueur agile qui ne se bat jamais loyalement."],
    },
    shop: {
        alchemist: ["Alchimiste", "Élixirs et potions pour la route."],
        general_store: ["Boutique générale", "Potions, équipement de base et pochettes mystère."],
    },
    enemy: {
        goblin: ["Gobelin", "Un pillard maigre et rusé qui tend des embuscades aux voyageurs en meute."],
        wolf: ["Loup sauvage", "Un prédateur rapide qui chasse le long des routes forestières."],
        slime: ["Slime visqueux", "Une masse d'apparence inoffensive qui dissout tout ce qu'elle touche."],
        bandit: ["Bandit de grand chemin", "Un hors-la-loi qui détrousse marchands et aventuriers."],
        giant_rat: ["Rat géant", "Un charognard démesuré qui prospère dans les caves et les égouts."],
        wild_boar: ["Sanglier furieux", "Une bête têtue qui charge quiconque entre sur son territoire."],
        skeleton: ["Squelette guerrier", "Des os agités par une ancienne malédiction."],
        spider: ["Araignée géante", "Une tisseuse venimeuse tapie dans les grottes sombres."],
        orc: ["Orc brutal", "Un guerrier brutal qui aime le combat en rase campagne."],
        ghost: ["Spectre errant", "Un esprit errant qui glace l'air autour de lui."],
        zombie: ["Zombie putréfié", "Un cadavre lent mais implacable, poussé par la faim."],
        dark_cultist: ["Cultiste de l'ombre", "Un fanatique qui marchande avec des pouvoirs interdits."],
        troll: ["Troll des cavernes", "Une brute gigantesque qui régénère ses blessures."],
        minotaur: ["Minotaure enragé", "Un gardien cornu des labyrinthes."],
        vampire: ["Seigneur vampire", "Un noble immortel qui se nourrit des vivants."],
        witch: ["Sorcière des marais", "Une jeteuse de sorts qui concocte des malédictions dans des masures isolées."],
        stone_golem: ["Golem de pierre", "Une construction ancienne taillée dans la roche vivante."],
        lich: ["Liche suprême", "Un sorcier qui a troqué sa vie contre un pouvoir immortel."],
        demon_lord: ["Seigneur démon", "Un souverain des plans infernaux."],
        ancient_dragon: ["Dragon ancien", "Un ver millénaire dont le souffle fait fondre des armées."],
        hydra: ["Hydre à sept têtes", "Une bête à plusieurs têtes qui régénère ce qu'on lui tranche."],
    },
    location: {
        "Twilight Farm": ["Ferme du Crépuscule"],
        "Emerald Ferry": ["Bac d'Émeraude"],
        "Deep Coast": ["Côte profonde"],
        "Bright Mill": ["Moulin Clair"],
        "Dungeon Of The Blind Oracle": ["Donjon de l'Oracle aveugle"],
        "Timeless Den": ["Antre intemporel"],
        "Southern Watch": ["Veille du Sud"],
        "Western Road": ["Route de l'Ouest"],
        "Palace Of Stars": ["Palais des Étoiles"],
    },
} as const satisfies Record<string, Record<string, Entry>>;

export type ContentKind = keyof typeof FR;

function lookup(kind: ContentKind, id: string): Entry | undefined {
    return (FR[kind] as Record<string, Entry>)[id];
}

/** Nom d'un élément de contenu dans la langue demandée (repli : texte de la librairie). */
export function contentName(locale: Locale, kind: ContentKind, id: string, fallback: string): string {
    if (locale === "fr") return lookup(kind, id)?.[0] ?? fallback;
    return fallback;
}

/** Description d'un élément de contenu dans la langue demandée (repli : texte de la librairie). */
export function contentDescription(
    locale: Locale,
    kind: ContentKind,
    id: string,
    fallback: string | undefined,
): string | undefined {
    if (locale === "fr") return lookup(kind, id)?.[1] ?? fallback;
    return fallback;
}
