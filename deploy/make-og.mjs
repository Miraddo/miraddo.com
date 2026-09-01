// Render public/og.png (1200x630), the social card for miraddo.com.
//
//   node deploy/make-og.mjs
//
// Drawn as a Flight Deck panel so a shared link looks like the site. Rendered
// through sharp (already present as an Astro dependency). Text uses a system
// sans stack rather than Space Grotesk: the rasteriser resolves fonts from the
// OS, not from @font-face, so asking for a webfont here would silently fall
// back anyway. Shapes and palette carry the brand.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const W = 1200;
const H = 630;

const GROUND = '#e8e6e1';
const PANEL = '#f4f2ee';
const NAVY = '#0f2233';
const YELLOW = '#f2c230';
const LINE = 'rgba(15,34,51,0.35)';
const MUTE = '#5d6d7a';

const SANS = "Segoe UI, Helvetica Neue, Arial, sans-serif";
const MONO = "Consolas, Menlo, DejaVu Sans Mono, monospace";

// Corner tick marks, the panel motif from the site.
const tick = (x, y, dx, dy) =>
  `<path d="M${x + dx * 18} ${y} H${x} V${y + dy * 18}" fill="none" stroke="${LINE}" stroke-width="2"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${GROUND}"/>

  <!-- top strip -->
  <rect x="0" y="0" width="${W}" height="64" fill="${NAVY}"/>
  <text x="48" y="41" font-family="${MONO}" font-size="17" font-weight="700"
        letter-spacing="3.4" fill="rgba(255,255,255,0.62)">MILAD POSHTDARI</text>
  <text x="352" y="41" font-family="${MONO}" font-size="17" font-weight="700"
        letter-spacing="3.4" fill="rgba(255,255,255,0.62)">HAMBURG · DE</text>
  <circle cx="612" cy="35" r="6" fill="${YELLOW}"/>
  <text x="630" y="41" font-family="${MONO}" font-size="17" font-weight="700"
        letter-spacing="3.4" fill="rgba(255,255,255,0.62)">AVAILABLE FOR CONVERSATION</text>

  <!-- main panel -->
  <rect x="32" y="96" width="${W - 64}" height="${H - 160}" fill="${PANEL}" stroke="rgba(15,34,51,0.18)" stroke-width="2"/>
  ${tick(34, 98, 1, 1)}
  ${tick(W - 34, H - 66, -1, -1)}

  <text x="72" y="164" font-family="${MONO}" font-size="19" font-weight="700"
        letter-spacing="3.6" fill="${MUTE}">IT CONSULTANT / LUFTHANSA INDUSTRY SOLUTIONS</text>

  <text x="68" y="286" font-family="${SANS}" font-size="112" font-weight="700"
        letter-spacing="-4" fill="${NAVY}">Milad</text>
  <text x="68" y="392" font-family="${SANS}" font-size="112" font-weight="700"
        letter-spacing="-4" fill="${NAVY}">Poshtdari</text>

  <rect x="72" y="428" width="104" height="7" fill="${YELLOW}"/>

  <text x="72" y="492" font-family="${SANS}" font-size="30" fill="#1c3a55">Go and systems engineer. I build and improve</text>
  <text x="72" y="532" font-family="${SANS}" font-size="30" fill="#1c3a55">large-scale services.</text>

  <text x="${W - 72}" y="532" text-anchor="end" font-family="${MONO}" font-size="22"
        font-weight="700" letter-spacing="2.6" fill="${MUTE}">miraddo.com</text>
</svg>`;

writeFileSync('deploy/og.svg', svg);

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/og.png');

const meta = await sharp('public/og.png').metadata();
console.log(`public/og.png  ${meta.width}x${meta.height}`);
