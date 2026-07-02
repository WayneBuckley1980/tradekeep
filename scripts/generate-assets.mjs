import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const assetsDir = path.join(process.cwd(), 'assets', 'images');

function renderBrandedSvg({
  width,
  height,
  background,
  tileFill,
  tileWidth,
  tileHeight,
  cornerRadius,
  fontSize,
  borderWidth = 6,
  borderColor = 'rgba(255,255,255,0.85)',
  shadowBlur = 28,
  shadowOpacity = 0.45,
}) {
  const tileX = (width - tileWidth) / 2;
  const tileY = (height - tileHeight) / 2;

  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="tileShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="${shadowBlur * 0.4}" flood-color="#000000" flood-opacity="${shadowOpacity}"/>
      <feDropShadow dx="0" dy="8" stdDeviation="${shadowBlur * 0.22}" flood-color="#000000" flood-opacity="${shadowOpacity * 0.65}"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${background}"/>
  <rect
    x="${tileX}"
    y="${tileY}"
    width="${tileWidth}"
    height="${tileHeight}"
    rx="${cornerRadius}"
    ry="${cornerRadius}"
    fill="${tileFill}"
    stroke="${borderColor}"
    stroke-width="${borderWidth}"
    filter="url(#tileShadow)"
  />
  <svg
    x="${tileX}"
    y="${tileY}"
    width="${tileWidth}"
    height="${tileHeight}"
    viewBox="0 0 ${tileWidth} ${tileHeight}"
  >
    <text
      x="50%"
      y="50%"
      dominant-baseline="middle"
      text-anchor="middle"
      font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
      font-size="${fontSize}"
      font-weight="700"
      fill="#FFFFFF"
    >TradeKeepCRM</text>
  </svg>
</svg>`);
}

async function main() {
  await mkdir(assetsDir, { recursive: true });

  const iconSvg = renderBrandedSvg({
    width: 1024,
    height: 1024,
    background: '#2A2A2A',
    tileFill: '#000000',
    tileWidth: 928,
    tileHeight: 928,
    cornerRadius: 224,
    fontSize: 88,
    borderWidth: 6,
    borderColor: '#FFFFFF',
    shadowBlur: 56,
    shadowOpacity: 0.5,
  });

  const splashSvg = renderBrandedSvg({
    width: 1284,
    height: 2778,
    background: '#2A2A2A',
    tileFill: '#000000',
    tileWidth: 980,
    tileHeight: 520,
    cornerRadius: 260,
    fontSize: 96,
    borderWidth: 6,
    borderColor: '#FFFFFF',
    shadowBlur: 64,
    shadowOpacity: 0.45,
  });

  await sharp(iconSvg).png().toFile(path.join(assetsDir, 'icon.png'));
  await sharp(splashSvg).png().toFile(path.join(assetsDir, 'splash-icon.png'));
  await sharp(iconSvg).resize(48, 48).png().toFile(path.join(assetsDir, 'favicon.png'));

  console.log('Generated icon.png, splash-icon.png, favicon.png');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
