import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const assetsDir = path.join(process.cwd(), 'assets', 'images');

function renderWordmarkSvg(width, height, background, fontSize) {
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${background}"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
    font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#FFFFFF">TradeKeep</text>
</svg>`);
}

async function main() {
  await mkdir(assetsDir, { recursive: true });

  const iconSvg = renderWordmarkSvg(1024, 1024, '#000000', 120);
  const splashSvg = renderWordmarkSvg(1284, 2778, '#2A2A2A', 96);

  await sharp(iconSvg).png().toFile(path.join(assetsDir, 'icon.png'));
  await sharp(splashSvg).png().toFile(path.join(assetsDir, 'splash-icon.png'));
  await sharp(iconSvg).resize(48, 48).png().toFile(path.join(assetsDir, 'favicon.png'));

  console.log('Generated icon.png, splash-icon.png, favicon.png');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
