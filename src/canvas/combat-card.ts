import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { AttachmentBuilder } from "discord.js";
import { COLORS, drawBar, font, roundedRect } from "./theme";

export interface Fighter {
    readonly name: string;
    readonly current: number;
    readonly max: number;
    /** Texte à droite du nom (palier de l'ennemi, niveau du joueur...). */
    readonly tag: string;
}

export const COMBAT_CARD_NAME = "combat-card.png";

function drawFighter(ctx: SKRSContext2D, fighter: Fighter, y: number, width: number): void {
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.text;
    ctx.font = font(34, "bold");
    ctx.fillText(fighter.name, 40, y + 34, width - 330);

    ctx.fillStyle = COLORS.muted;
    ctx.font = font(22);
    ctx.textAlign = "right";
    ctx.fillText(fighter.tag, width - 40, y + 32);

    drawBar(ctx, 40, y + 50, width - 80, 30, fighter.max > 0 ? fighter.current / fighter.max : 0);

    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.text;
    ctx.font = font(24, "bold");
    ctx.fillText(`${Math.max(0, Math.round(fighter.current))} / ${Math.round(fighter.max)}`, 40, y + 112);
}

/** Carte de combat : deux barres de vie (ennemi au-dessus, joueur en dessous) sur fond noir. */
export async function renderCombatCard(enemy: Fighter, player: Fighter): Promise<AttachmentBuilder> {
    const width = 900;
    const height = 330;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);
    roundedRect(ctx, 10, 10, width - 20, height - 20, 20);
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    drawFighter(ctx, enemy, 22, width);
    ctx.strokeStyle = COLORS.line;
    ctx.beginPath();
    ctx.moveTo(40, 168);
    ctx.lineTo(width - 40, 168);
    ctx.stroke();
    drawFighter(ctx, player, 180, width);

    return new AttachmentBuilder(await canvas.encode("png"), { name: COMBAT_CARD_NAME });
}
