import { loadImage, type Image } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { IMAGES_DIR } from "./theme";

/**
 * Illustration d'un ennemi si elle existe : `images/enemies/<type>.png` (ou .webp / .jpg).
 * Sans fichier, les cartes dessinent un motif de remplacement : le jeu fonctionne sans aucune ressource.
 */
export async function enemyImage(type: string): Promise<Image | undefined> {
    for (const extension of ["png", "webp", "jpg"]) {
        const path = join(IMAGES_DIR, "enemies", `${type}.${extension}`);
        if (existsSync(path)) return loadImage(path).catch(() => undefined);
    }
    return undefined;
}
