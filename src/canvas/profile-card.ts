import { createCanvas } from "@napi-rs/canvas";
import { AttachmentBuilder } from "discord.js";
import type { EmojiKey } from "../core/emojis";
import { drawGlyph } from "./glyphs";
import { COLORS, drawBar, font, roundedRect } from "./theme";

export interface ProfileCardData {
    readonly name: string;
    readonly subtitle: string;
    readonly level: string;
    readonly experience: { ratio: number; label: string };
    readonly health: { ratio: number; label: string };
    readonly attributes: ReadonlyArray<{ icon: EmojiKey; label: string; value: string }>;
    readonly holdings: ReadonlyArray<{ icon: EmojiKey; value: string }>;
}

export const PROFILE_CARD_NAME = "profile-card.png";

/** Carte de profil : portrait, niveau, barres d'expérience et de vie, attributs et avoirs. Monochrome. */
export async function renderProfileCard(data: ProfileCardData): Promise<AttachmentBuilder> {
    const width = 1000;
    const height = 430;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);
    roundedRect(ctx, 12, 12, width - 24, height - 24, 22);
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Portrait + niveau.
    roundedRect(ctx, 44, 44, 150, 150, 20);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 3;
    ctx.stroke();
    await drawGlyph(ctx, "character", 44 + 25, 44 + 25, 100);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    const left = 224;
    ctx.fillStyle = COLORS.text;
    ctx.font = font(48, "bold");
    ctx.fillText(data.name, left, 92, width - left - 200);
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(23);
    ctx.fillText(data.subtitle, left, 128, width - left - 60);

    // Pastille de niveau à droite.
    ctx.font = font(30, "bold");
    const levelWidth = ctx.measureText(data.level).width + 84;
    roundedRect(ctx, width - 48 - levelWidth, 52, levelWidth, 52, 26);
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 2;
    ctx.stroke();
    await drawGlyph(ctx, "level", width - 48 - levelWidth + 14, 62, 32);
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = "left";
    ctx.fillText(data.level, width - 48 - levelWidth + 54, 90);

    // Barres : expérience puis vie.
    const bars = [
        { icon: "experience", ...data.experience, y: 148 },
        { icon: "health", ...data.health, y: 188 },
    ] as const;
    for (const bar of bars) {
        await drawGlyph(ctx, bar.icon, left, bar.y - 4, 30);
        drawBar(ctx, left + 42, bar.y, width - left - 42 - 48 - 190, 22, bar.ratio);
        ctx.fillStyle = COLORS.text;
        ctx.font = font(22, "bold");
        ctx.textAlign = "right";
        ctx.fillText(bar.label, width - 48, bar.y + 19);
    }

    // Attributs : une case par attribut.
    ctx.strokeStyle = COLORS.line;
    ctx.beginPath();
    ctx.moveTo(44, 236);
    ctx.lineTo(width - 44, 236);
    ctx.stroke();
    const cell = (width - 88 - (data.attributes.length - 1) * 16) / Math.max(1, data.attributes.length);
    for (const [index, attribute] of data.attributes.entries()) {
        const x = 44 + index * (cell + 16);
        roundedRect(ctx, x, 256, cell, 84, 16);
        ctx.fillStyle = COLORS.panel;
        ctx.fill();
        ctx.strokeStyle = COLORS.line;
        ctx.lineWidth = 2;
        ctx.stroke();
        await drawGlyph(ctx, attribute.icon, x + 16, 274, 48);
        ctx.textAlign = "left";
        ctx.fillStyle = COLORS.muted;
        ctx.font = font(18);
        ctx.fillText(attribute.label.toUpperCase(), x + 76, 288, cell - 90);
        ctx.fillStyle = COLORS.text;
        ctx.font = font(36, "bold");
        ctx.fillText(attribute.value, x + 76, 326);
    }

    // Avoirs : or, banque, position...
    const slot = (width - 88) / Math.max(1, data.holdings.length);
    for (const [index, holding] of data.holdings.entries()) {
        const x = 44 + index * slot;
        await drawGlyph(ctx, holding.icon, x, 364, 34);
        ctx.fillStyle = COLORS.text;
        ctx.font = font(24, "bold");
        ctx.textAlign = "left";
        ctx.fillText(holding.value, x + 44, 389, slot - 56);
    }

    return new AttachmentBuilder(await canvas.encode("png"), { name: PROFILE_CARD_NAME });
}
