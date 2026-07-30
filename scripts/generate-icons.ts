/**
 * Generates the PWA icon set from one vector source.
 *
 * Android will not offer to install a web app without real PNG icons at the
 * documented sizes, and a maskable variant is what stops the mark being cropped
 * into a circle on launchers that apply their own shape. Both are produced here
 * so the whole set stays in step with the brand in one place.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const BRAND = "#ffc800";
const INK = "#12110f";
const OUT = path.join(process.cwd(), "public", "icons");

/** The wordmark's "IT" tile. `inset` leaves room for maskable safe-zone cropping. */
function markSvg(size: number, inset: number, rounded: boolean) {
  const box = size - inset * 2;
  const radius = rounded ? box * 0.22 : 0;
  const fontSize = box * 0.42;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${rounded ? "none" : BRAND}"/>
  <rect x="${inset}" y="${inset}" width="${box}" height="${box}" rx="${radius}" fill="${BRAND}"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle"
        font-family="Manrope, Inter, Arial, sans-serif" font-weight="800"
        font-size="${fontSize}" fill="${INK}" letter-spacing="${fontSize * -0.03}">IT</text>
</svg>`;
}

/** Full-bleed brand plate for maskable icons: launchers may crop up to 20%. */
function maskableSvg(size: number) {
  const fontSize = size * 0.3;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BRAND}"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle"
        font-family="Manrope, Inter, Arial, sans-serif" font-weight="800"
        font-size="${fontSize}" fill="${INK}">IT</text>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, svg: (s: number) => markSvg(s, 0, true) },
  { file: "icon-512.png", size: 512, svg: (s: number) => markSvg(s, 0, true) },
  { file: "icon-maskable-192.png", size: 192, svg: maskableSvg },
  { file: "icon-maskable-512.png", size: 512, svg: maskableSvg },
  { file: "apple-touch-icon.png", size: 180, svg: (s: number) => markSvg(s, 0, false) },
  { file: "favicon-32.png", size: 32, svg: (s: number) => markSvg(s, 0, true) },
];

async function main() {
  await mkdir(OUT, { recursive: true });

  for (const target of targets) {
    const svg = Buffer.from(target.svg(target.size));
    const png = await sharp(svg, { density: 384 }).png({ compressionLevel: 9 }).toBuffer();
    await writeFile(path.join(OUT, target.file), png);
    console.log(`  ${target.file.padEnd(26)} ${target.size}×${target.size}  ${(png.length / 1024).toFixed(1)} kB`);
  }

  console.log(`\n${targets.length} icons written to public/icons`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
