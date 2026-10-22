// Imágenes responsive: cada JPG de src/img se convierte en 3 anchos × 3 formatos.
// AVIF (el más ligero) → WebP → JPEG (respaldo universal), servidos con <picture>.
// Codificar AVIF es lento (~12 s las 18 variantes), así que se guardan en
// .cache/img y solo se regeneran si el original es más nuevo que su variante.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, extname } from 'node:path';
import sharp from 'sharp';

export const WIDTHS = [480, 800, 1200];

const FORMATS = {
  avif: (img) => img.avif({ quality: 50, effort: 4 }),
  webp: (img) => img.webp({ quality: 72 }),
  jpg: (img) => img.jpeg({ quality: 75, mozjpeg: true }),
};

const isFresh = (output, source) =>
  existsSync(output) && statSync(output).mtimeMs >= statSync(source).mtimeMs;

export async function buildImages(srcDir, cacheDir, outDir) {
  mkdirSync(cacheDir, { recursive: true });
  const jobs = [];
  for (const file of readdirSync(srcDir).filter((f) => /\.jpe?g$/i.test(f))) {
    const source = `${srcDir}/${file}`;
    const name = basename(file, extname(file));
    for (const width of WIDTHS) {
      for (const [ext, encode] of Object.entries(FORMATS)) {
        const output = `${cacheDir}/${name}-${width}.${ext}`;
        if (isFresh(output, source)) continue;
        // withoutEnlargement: nunca agranda una imagen más pequeña que el ancho pedido.
        jobs.push(encode(sharp(source).resize({ width, withoutEnlargement: true })).toFile(output));
      }
    }
  }
  await Promise.all(jobs);
  cpSync(cacheDir, outDir, { recursive: true });
  return jobs.length;
}

// Íconos PNG a partir de favicon.svg (sin texto, así que no depende de Pango).
// Fondo Ink a sangre: iOS rellena la transparencia de apple-touch-icon con negro
// y redondea las esquinas por su cuenta. Nombres fijos en la raíz: iOS pide
// /apple-touch-icon.png por convención y el manifest los referencia por nombre.
export async function buildIcons(svgPath, outDir) {
  const icons = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };
  await Promise.all(
    Object.entries(icons).map(([file, size]) =>
      sharp(svgPath, { density: (72 * size) / 32 }) // el SVG mide 32 px
        .resize(size, size)
        .flatten({ background: '#0e0f12' })
        .png({ compressionLevel: 9 })
        .toFile(`${outDir}/${file}`),
    ),
  );
}
