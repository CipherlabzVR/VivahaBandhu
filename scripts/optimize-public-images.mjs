import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve('public');

/** Large PNGs used on marketing pages — write WebP siblings (keep originals as fallback). */
const targets = [
  { file: 'blog1.png', width: 800 },
  { file: 'blog2.png', width: 800 },
  { file: 'blog4.png', width: 800 },
  { file: 'abouthero.png', width: 1600 },
  { file: 'success.png', width: 1600 },
  { file: 'who.png', width: 1400 },
  { file: 'logo4.png', width: 480 },
];

for (const { file, width } of targets) {
  const src = path.join(publicDir, file);
  const dest = src.replace(/\.(png|jpe?g)$/i, '.webp');
  try {
    await fs.access(src);
  } catch {
    console.warn('skip missing', file);
    continue;
  }
  const input = sharp(src).rotate();
  const meta = await input.metadata();
  const pipeline =
    meta.width && meta.width > width ? input.resize({ width, withoutEnlargement: true }) : input;
  await pipeline.webp({ quality: 78, effort: 5 }).toFile(dest);
  const before = (await fs.stat(src)).size;
  const after = (await fs.stat(dest)).size;
  console.log(
    `${file} -> ${path.basename(dest)}: ${(before / 1024 / 1024).toFixed(2)}MB -> ${(after / 1024 / 1024).toFixed(2)}MB`
  );
}
