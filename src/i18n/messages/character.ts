import { defineMessages } from "../define";

export const character = defineMessages({
    fr: {
        "character.desc": "Crée, supprime ou consulte les classes de ton personnage.",
        "character.create.desc": "Crée ton personnage et commence l'aventure.",
        "character.delete.desc": "Supprime définitivement ton personnage.",
        "character.classes.desc": "Liste les classes disponibles et leurs statistiques.",
        "character.created.title": "Bienvenue, {name}",
        "character.created.body":
            "Tu commences ton aventure en tant que **{class}** à **{location}**, avec **{gold}** et {items} en poche.",
        "character.created.hint": "Utilise `/profil` pour consulter ta fiche et `/inventaire voir` pour ton sac.",
        "character.delete.confirm":
            "Supprimer définitivement ton personnage ? Ton inventaire, ton coffre, ta progression et tes succès seront perdus.",
        "character.deleted": "Ton personnage a été supprimé.",
        "character.deleteFailed": "Impossible de supprimer ton personnage.",
        "character.classes.title": "Classes",
        "character.classes.stats": "Force {strength} • Agilité {agility} • Intelligence {intelligence} • Défense {defense}",
        "character.classes.attack": "Attaque basée sur : {stat}",
        "character.items.count": "{count} objet(s)",
    },
    "en-US": {
        "character.desc": "Create, delete or browse the classes of your character.",
        "character.create.desc": "Create your character and start the adventure.",
        "character.delete.desc": "Permanently delete your character.",
        "character.classes.desc": "List the available classes and their statistics.",
        "character.created.title": "Welcome, {name}",
        "character.created.body":
            "You start your adventure as a **{class}** in **{location}**, with **{gold}** and {items} in your bag.",
        "character.created.hint": "Use `/profile` to see your sheet and `/inventory view` for your bag.",
        "character.delete.confirm":
            "Permanently delete your character? Your inventory, vault, progress and achievements will be lost.",
        "character.deleted": "Your character has been deleted.",
        "character.deleteFailed": "Unable to delete your character.",
        "character.classes.title": "Classes",
        "character.classes.stats": "Strength {strength} • Agility {agility} • Intelligence {intelligence} • Defense {defense}",
        "character.classes.attack": "Attacks based on: {stat}",
        "character.items.count": "{count} item(s)",
    },
});
