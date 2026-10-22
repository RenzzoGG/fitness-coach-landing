// Imagen Open Graph (1200×630 PNG) con las fuentes de la marca.
// sharp dibuja texto con Pango, pero su fontconfig no carga WOFF/WOFF2: se
// convierte el WOFF 1 de @fontsource a TTF (woff-to-sfnt.mjs, sin
// dependencias) y se le pasa como fontfile. Se ejecuta a mano (npm run og) y
// el PNG se versiona en src/static: así el build no depende de Pango.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { woffToSfnt } from './woff-to-sfnt.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const W = 1200;
const H = 630;
const C = { ink: '#0e0f12', chalk: '#f4f4f0', steel: '#9aa0aa', volt: '#c6f432', line: '#2a2d35' };

// WOFF → TTF en .cache/fonts (ignorada por git).
mkdirSync(`${root}.cache/fonts`, { recursive: true });
const font = (pkg, weight) => {
  const woff = `${root}node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff`;
  const ttf = `${root}.cache/fonts/${pkg}-${weight}.ttf`;
  writeFileSync(ttf, woffToSfnt(readFileSync(woff)));
  return ttf;
};
const grotesk = font('space-grotesk', 700);
const dmSans = font('dm-sans', 500);

// Capa de texto Pango (markup). dpi 72 → el tamaño de la fuente va en px.
// Ojo con el nombre: el de DM Sans 500 es literalmente "DM Sans Medium"; la coma
// final ("DM Sans Medium, 28") le dice a Pango que todo eso es la familia. Sin
// ella, Pango busca "DM Sans" con peso Medium, no la encuentra y usa DejaVu.
const text = (markup, fontDesc, fontfile, width) =>
  sharp({ text: { text: markup, font: fontDesc, fontfile, width, rgba: true, dpi: 72, spacing: 4 } })
    .png()
    .toBuffer();

// Fondo: rejilla técnica que se desvanece y la foto del hero a la derecha.
const photoWidth = 420;
const background = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="${C.chalk}" stroke-opacity=".07"/>
    </pattern>
    <radialGradient id="fade" cx="35%" cy="50%" r="65%">
      <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="m"><rect width="100%" height="100%" fill="url(#fade)"/></mask>
  </defs>
  <rect width="100%" height="100%" fill="${C.ink}"/>
  <rect width="100%" height="100%" fill="url(#grid)" mask="url(#m)"/>
</svg>`);

// Degradado sobre el borde izquierdo de la foto para fundirla con el fondo.
const photoFade = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${photoWidth}" height="${H}">
  <defs><linearGradient id="g"><stop offset="0" stop-color="${C.ink}"/><stop offset=".45" stop-color="${C.ink}" stop-opacity="0"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`);

const photo = await sharp(`${root}src/img/hero-dumbbell-grip.jpg`)
  .resize(photoWidth, H, { fit: 'cover', position: 'centre' })
  .composite([{ input: photoFade }])
  .toBuffer();

// Logo: el mismo trazo de pulso del navbar.
const mark = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 32 32">
  <path d="M3 17h6l3-7 5 13 3-6h9" fill="none" stroke="${C.volt}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);

const x = 80;
const layers = [
  { input: photo, left: W - photoWidth, top: 0 },
  { input: mark, left: x, top: 76 },
  {
    input: await text(`<span foreground="${C.chalk}" letter_spacing="3072">PULSE THEORY</span>`, 'Space Grotesk Bold 26', grotesk),
    left: x + 58, top: 84,
  },
  {
    input: await text(
      `<span foreground="${C.chalk}">Train with <span foreground="${C.volt}">intent.</span>\nGet strong for\nreal life.</span>`,
      'Space Grotesk Bold 76', grotesk, 700,
    ),
    left: x, top: 178,
  },
  {
    input: await text(`<span foreground="${C.steel}">Online strength &amp; performance coaching</span>`, 'DM Sans Medium, 28', dmSans),
    left: x, top: 482,
  },
  {
    input: await text(`<span foreground="${C.volt}">pulse.renzzogg.com</span><span foreground="${C.steel}">  ·  Demo project, fictional brand</span>`, 'DM Sans Medium, 22', dmSans),
    left: x, top: 540,
  },
];

const out = `${root}src/static/og-image.png`;
await sharp(background)
  .composite(layers)
  .png({ compressionLevel: 9, palette: true, quality: 90, dither: 0.6 }) // paleta: mucho más ligera
  .toFile(out);

const { width, height, format } = await sharp(out).metadata();
console.log(`${out.replace(root, '')}: ${width}×${height} ${format}`);
