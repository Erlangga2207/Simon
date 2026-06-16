// Generate PWA / SEO image assets from public/images/simon-logo.jpg
// Run: node scripts/gen-pwa-assets.mjs
// Requires `sharp` (tersedia transitif lewat Next 16). Aman dijalankan ulang.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const SRC = path.join(root, "public", "images", "simon-logo.jpg");
const BRAND = "#059669"; // primary Simon
const NAVY = "#0b1120"; // background dark Simon

await mkdir(path.join(root, "public", "icons"), { recursive: true });

const logo = sharp(SRC);

// --- Icon "any" (transparan, logo penuh) ---
async function plainIcon(size, out) {
  await sharp(SRC).resize(size, size, { fit: "cover" }).png().toFile(out);
  console.log("ok", out);
}

// --- Icon "maskable" (safe zone 80%: logo 80% di atas background solid) ---
async function maskableIcon(size, out, bg = "#ffffff") {
  const inner = Math.round(size * 0.78);
  const resized = await sharp(SRC).resize(inner, inner, { fit: "cover" }).png().toBuffer();
  const pad = Math.round((size - inner) / 2);
  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: resized, top: pad, left: pad }])
    .png()
    .toFile(out);
  console.log("ok", out);
}

// --- OG image 1200x630 ---
async function ogImage(out) {
  const W = 1200;
  const H = 630;
  const logoSize = 200;
  const logoBuf = await sharp(SRC)
    .resize(logoSize, logoSize, { fit: "cover" })
    .composite([
      {
        input: Buffer.from(
          `<svg><rect x="0" y="0" width="${logoSize}" height="${logoSize}" rx="36" ry="36"/></svg>`
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const svg = `
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${NAVY}"/>
        <stop offset="100%" stop-color="#0d2a22"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <text x="80" y="330" font-family="Inter, Arial, sans-serif" font-size="78" font-weight="800" fill="#ffffff">Simon</text>
    <text x="82" y="400" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="600" fill="${BRAND}">Pengelola Keuangan</text>
    <text x="82" y="465" font-family="Inter, Arial, sans-serif" font-size="28" fill="#94a3b8">Keuangan pribadi, laba usaha &amp; portofolio investasi</text>
    <text x="82" y="510" font-family="Inter, Arial, sans-serif" font-size="28" fill="#94a3b8">— dalam satu aplikasi. Gratis.</text>
  </svg>`;

  await sharp(Buffer.from(svg))
    .composite([{ input: logoBuf, top: 215, left: 920 }])
    .png()
    .toFile(out);
  console.log("ok", out);
}

await plainIcon(192, path.join(root, "public", "icons", "icon-192.png"));
await plainIcon(512, path.join(root, "public", "icons", "icon-512.png"));
await maskableIcon(192, path.join(root, "public", "icons", "maskable-192.png"));
await maskableIcon(512, path.join(root, "public", "icons", "maskable-512.png"));
// Apple touch icon: 180x180, background putih solid (iOS tak dukung transparansi)
await maskableIcon(180, path.join(root, "public", "apple-touch-icon.png"), "#ffffff");
// Favicon via konvensi App Router (src/app/icon.png) + favicon.ico legacy
await plainIcon(256, path.join(root, "src", "app", "icon.png"));
await ogImage(path.join(root, "public", "og-image.png"));

console.log("Selesai.");
