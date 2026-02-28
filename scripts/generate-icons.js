const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, '../client/public/icons/icon.svg');
const outputDir = path.join(__dirname, '../client/public/icons');

const sizes = [192, 512];

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated: icon-${size}.png`);
  }
  console.log('Done!');
}

generateIcons().catch(console.error);
