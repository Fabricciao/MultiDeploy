// Génère les icônes PWA (192, 512, maskable, apple-touch) à partir d'un SVG. Usage : node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#1f4fd8"/><g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})"><path d="M96 384V176l160-96 160 96v208h-96V248l-64 40-64-40v136z" fill="#fff"/></g></svg>`;
mkdirSync("public/icons", { recursive: true });
const out = async (name, size, pad) => sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(`public/icons/${name}`);
await out("icon-192.png", 192, 0); await out("icon-512.png", 512, 0); await out("maskable-512.png", 512, 80); await out("apple-touch-icon.png", 180, 0);
