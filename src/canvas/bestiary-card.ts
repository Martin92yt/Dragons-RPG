import { createCanvas } from "@napi-rs/canvas";
import { AttachmentBuilder } from "discord.js";
import { enemyImage } from "./images";
import { COLORS, drawBar, font, roundedRect, wrapText } from "./theme";

export interface BestiaryCardData {
    readonly type: string;
    readonly name: string;
    readonly tier: string;
    readonly description: string;
    readonly stats: ReadonlyArray<{ label: string; value: string }>;
    readonly rewards: string;
    readonly kills: string;
    readonly firstDefeat: string;
    /** Progression du bestiaire (0-1) et son libellé. */
    readonly progress: { ratio: number; label: string };
}

export const BESTIARY_CARD_NAME = "bestiary-card.png";

/** Fiche de bestiaire : portrait à gauche, nom, palier, description, statistiques et progression à droite. */
export async function renderBestiaryCard(data: BestiaryCardData): Promise<AttachmentBuilder> {
    const width = 1000;
    const height = 460;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);
    roundedRect(ctx, 12, 12, width - 24, height - 24, 22);
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Portrait : illustration si disponible, sinon grande initiale dans un cadre.
    const size = 330;
    const px = 48;
    const py = 48;
    roundedRect(ctx, px, py, size, size, 18);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();
    ctx.save();
    roundedRect(ctx, px, py, size, size, 18);
    ctx.clip();
    const image = await enemyImage(data.type);
    if (image) {
        const scale = Math.max(size / image.width, size / image.height);
        ctx.drawImage(image, px + (size - image.width * scale) / 2, py + (size - image.height * scale) / 2, image.width * scale, image.height * scale);
    } else {
        ctx.fillStyle = COLORS.line;
        ctx.font = font(190, "bold");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(data.name.charAt(0).toUpperCase(), px + size / 2, py + size / 2 + 6);
    }
    ctx.restore();
    roundedRect(ctx, px, py, size, size, 18);
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const left = 420;

    ctx.fillStyle = COLORS.text;
    ctx.font = font(50, "bold");
    ctx.fillText(data.name, left, 96, width - left - 48);

    // Palier : pastille en contour.
    ctx.font = font(24, "bold");
    const tierWidth = ctx.measureText(data.tier).width + 34;
    roundedRect(ctx, left, 114, tierWidth, 40, 20);
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillText(data.tier, left + 17, 143);

    ctx.fillStyle = COLORS.muted;
    ctx.font = font(24);
    wrapText(ctx, data.description, width - left - 56, 3).forEach((line, index) => ctx.fillText(line, left, 198 + index * 32));

    // Statistiques en colonnes.
    const columnWidth = (width - left - 56) / Math.max(1, data.stats.length);
    data.stats.forEach((stat, index) => {
        const x = left + index * columnWidth;
        ctx.fillStyle = COLORS.muted;
        ctx.font = font(20);
        ctx.fillText(stat.label.toUpperCase(), x, 318);
        ctx.fillStyle = COLORS.text;
        ctx.font = font(40, "bold");
        ctx.fillText(stat.value, x, 362);
    });

    ctx.fillStyle = COLORS.muted;
    ctx.font = font(21);
    ctx.fillText(`${data.rewards}   •   ${data.kills}   •   ${data.firstDefeat}`, left, 400, width - left - 48);

    drawBar(ctx, left, 414, width - left - 48, 14, data.progress.ratio);
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(16);
    ctx.textAlign = "right";
    ctx.fillText(data.progress.label, width - 48, 408);

    return new AttachmentBuilder(await canvas.encode("png"), { name: BESTIARY_CARD_NAME });
}
