import { GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Dossier des ressources du projet (illustrations, polices) : `images/` à la racine du dépôt. */
export const IMAGES_DIR = join(process.cwd(), "images");

/** Palette strictement monochrome. */
export const COLORS = {
    background: "#0b0b0b",
    panel: "#141414",
    line: "#3a3a3a",
    muted: "#8a8a8a",
    text: "#ffffff",
} as const;

// Police personnalisée facultative : `images/font.ttf` (ou .otf) si elle existe.
for (const file of ["font.ttf", "font.otf"]) {
    const path = join(IMAGES_DIR, file);
    if (existsSync(path)) GlobalFonts.registerFromPath(path, "DragonsFont");
}
export const FONT = GlobalFonts.has("DragonsFont") ? "DragonsFont" : "sans-serif";

export const font = (size: number, weight: "normal" | "bold" = "normal") => `${weight} ${size}px ${FONT}`;

/** Rectangle aux coins arrondis (le `roundRect` natif n'est pas garanti partout). */
export function roundedRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/** Barre de vie : fond sombre, remplissage blanc, graduations discrètes. */
export function drawBar(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, ratio: number): void {
    const clamped = Math.min(1, Math.max(0, ratio));
    roundedRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.line;
    ctx.stroke();
    if (clamped > 0) {
        ctx.save();
        roundedRect(ctx, x, y, w, h, h / 2);
        ctx.clip();
        ctx.fillStyle = COLORS.text;
        ctx.fillRect(x, y, w * clamped, h);
        ctx.restore();
    }
    ctx.strokeStyle = COLORS.background;
    ctx.lineWidth = 2;
    for (let i = 1; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(x + (w * i) / 10, y + 3);
        ctx.lineTo(x + (w * i) / 10, y + h - 3);
        ctx.stroke();
    }
}

/** Coupe un texte en lignes qui tiennent dans `maxWidth` pixels. */
export function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number, maxLines: number): string[] {
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
        const next = current ? `${current} ${word}` : word;
        if (current && ctx.measureText(next).width > maxWidth) {
            lines.push(current);
            current = word;
        } else {
            current = next;
        }
    }
    if (current) lines.push(current);
    if (lines.length > maxLines) {
        lines.length = maxLines;
        lines[maxLines - 1] = `${lines[maxLines - 1]!.replace(/\s*\S*$/, "")}…`;
    }
    return lines;
}
