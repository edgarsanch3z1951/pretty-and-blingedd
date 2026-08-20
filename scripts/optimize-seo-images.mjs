import path from "node:path";
import sharp from "sharp";

const dir = path.resolve("public/images");

const conversions = [
  ["beforeafter1.PNG", "beforeafter1.webp"],
  ["beforeafter2.PNG", "beforeafter2.webp"],
  ["before after 3.PNG", "before-after-3.webp"],
  ["gem.PNG", "gem.webp"],
];

for (const [src, dest] of conversions) {
  await sharp(path.join(dir, src)).webp({ quality: 82 }).toFile(path.join(dir, dest));
  console.log("wrote", dest);
}

const logo = await sharp(path.join(dir, "logo.webp")).resize(220, 220).toBuffer();
const card = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#fff7f9"/>
  <rect x="48" y="48" width="1104" height="534" rx="48" fill="#fde6ee"/>
  <text x="600" y="430" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-style="italic" fill="#1a1216">Bright smiles. Pretty gems. At your door.</text>
  <text x="600" y="490" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#ec1e79">Teeth Whitening &amp; Tooth Gems · Ventura County</text>
  <text x="600" y="545" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#6b5560">prettyandblingedd</text>
</svg>`);

await sharp({
  create: { width: 1200, height: 630, channels: 3, background: "#fff7f9" },
})
  .composite([
    { input: card, top: 0, left: 0 },
    { input: logo, top: 120, left: 490 },
  ])
  .webp({ quality: 88 })
  .toFile(path.join(dir, "og-image.webp"));

console.log("wrote og-image.webp");
