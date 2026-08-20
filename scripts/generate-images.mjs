import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const outDir = new URL("../public/images/", import.meta.url);
await mkdir(outDir, { recursive: true });
const outPath = fileURLToPath(outDir);

await sharp(fileURLToPath(new URL("../src/assets/logo.png", import.meta.url)))
  .resize(512, 512, { fit: "cover", position: "centre" })
  .webp({ quality: 90 })
  .toFile(`${outPath}logo.webp`);

const slides = [
  { file: "gallery-1.webp", bg: "#f9c2d3", label: "Before → After" },
  { file: "gallery-2.webp", bg: "#ffd6e5", label: "Whitening glow" },
  { file: "gallery-3.webp", bg: "#ffb7d5", label: "Tooth gem detail" },
  { file: "gallery-4.webp", bg: "#fde6ee", label: "Pretty + blinged" },
];

for (const slide of slides) {
  const svg = `
    <svg width="600" height="750" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="50%" cy="38%" r="55%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="${slide.bg}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="600" height="750" fill="${slide.bg}"/>
      <rect width="600" height="750" fill="url(#glow)"/>
      <polygon points="300,250 306,268 325,268 310,280 315,298 300,287 285,298 290,280 275,268 294,268" fill="#ffffff" fill-opacity="0.9"/>
      <text x="300" y="360" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-style="italic" fill="#1A1216">Pretty and Blingedd</text>
      <text x="300" y="408" text-anchor="middle" font-family="Manrope, sans-serif" font-size="20" fill="#6B5560">${slide.label}</text>
      <text x="300" y="444" text-anchor="middle" font-family="Manrope, sans-serif" font-size="15" fill="#6B5560">Photo coming soon</text>
    </svg>
  `;

  await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(`${outPath}${slide.file}`);
}

console.log("Wrote logo.webp and gallery placeholders.");
