import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { AttachmentBuilder } from "discord.js";
import type { EmojiKey } from "../core/emojis";
import { drawGlyph } from "./glyphs";
import { COLORS, drawBar, font, roundedRect } from "./theme";

export interface Fighter {
    readonly name: string;
    readonly current: number;
    readonly max: number;
    /** Texte à droite du nom (palier de l'ennemi, niveau du joueur...). */
    readonly tag: string;
    /** Portrait du combattant (glyphe de `images/`). */
    readonly icon: EmojiKey;
}

export const COMBAT_CARD_NAME = "combat-card.png";

const PORTRAIT = 96;

async function drawFighter(ctx: SKRSContext2D, fighter: Fighter, y: number, width: number): Promise<void> {
    // Portrait : glyphe dans un cadre blanc.
    roundedRect(ctx, 40, y + 8, PORTRAIT, PORTRAIT, 16);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 3;
    ctx.stroke();
    await drawGlyph(ctx, fighter.icon, 40 + 12, y + 8 + 12, PORTRAIT - 24);

    const left = 40 + PORTRAIT + 28;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.text;
    ctx.font = font(34, "bold");
    ctx.fillText(fighter.name, left, y + 38, width - left - 230);

    ctx.fillStyle = COLORS.muted;
    ctx.font = font(22);
    ctx.textAlign = "right";
    ctx.fillText(fighter.tag, width - 40, y + 36);

    drawBar(ctx, left, y + 54, width - left - 40, 26, fighter.max > 0 ? fighter.current / fighter.max : 0);

    await drawGlyph(ctx, "health", left, y + 86, 26);
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.text;
    ctx.font = font(24, "bold");
    ctx.fillText(`${Math.max(0, Math.round(fighter.current))} / ${Math.round(fighter.max)}`, left + 34, y + 108);
}

/** Carte de combat : portrait + barre de vie de l'ennemi (en haut) et du joueur (en bas), séparés par un glyphe d'épée. */
export async function renderCombatCard(enemy: Fighter, player: Fighter): Promise<AttachmentBuilder> {
    const width = 900;
    const height = 370;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);
    roundedRect(ctx, 10, 10, width - 20, height - 20, 20);
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    await drawFighter(ctx, enemy, 26, width);

    // Séparateur : ligne interrompue par un glyphe de combat.
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    for (const [from, to] of [
        [40, width / 2 - 28],
        [width / 2 + 28, width - 40],
    ] as const) {
        ctx.beginPath();
        ctx.moveTo(from, 184);
        ctx.lineTo(to, 184);
        ctx.stroke();
    }
    await drawGlyph(ctx, "attack", width / 2 - 18, 166, 36);

    await drawFighter(ctx, player, 214, width);

    return new AttachmentBuilder(await canvas.encode("png"), { name: COMBAT_CARD_NAME });
}
