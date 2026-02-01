import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const iconsDir = join(rootDir, 'src-tauri', 'icons');
const publicDir = join(rootDir, 'public');

const svgPath = join(iconsDir, 'qr-foundry-logo.svg');
const svgBuffer = readFileSync(svgPath);

// Icon sizes needed for Tauri
const tauriIcons = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  // Windows Store logos
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
];

async function generatePng(outputPath, size) {
  await sharp(svgBuffer, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`Generated: ${outputPath}`);
}

async function generateIco(outputPath) {
  // Generate multiple sizes for ICO
  const sizes = [16, 32, 48, 64, 128, 256];
  const images = await Promise.all(
    sizes.map(async (size) => {
      const buffer = await sharp(svgBuffer, { density: 300 })
        .resize(size, size)
        .png()
        .toBuffer();
      return { size, buffer };
    })
  );

  // Simple ICO file format
  // ICO header: 6 bytes
  // ICO directory entries: 16 bytes each
  // Image data follows

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(images.length, 4); // Number of images

  const dirEntries = [];
  let offset = 6 + images.length * 16;

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // Width (0 = 256)
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // Height (0 = 256)
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Image size
    entry.writeUInt32LE(offset, 12); // Image offset
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  const ico = Buffer.concat([
    header,
    ...dirEntries,
    ...images.map((img) => img.buffer),
  ]);

  writeFileSync(outputPath, ico);
  console.log(`Generated: ${outputPath}`);
}

async function generateIcns(outputPath) {
  // ICNS is complex, but we can create a simple version with iconutil
  // For now, generate a high-res PNG that can be converted
  // macOS apps often just need the PNG files in the icons folder

  // Generate the required sizes
  const sizes = [16, 32, 64, 128, 256, 512, 1024];

  // Create iconset directory
  const iconsetDir = join(iconsDir, 'AppIcon.iconset');
  mkdirSync(iconsetDir, { recursive: true });

  const iconsetFiles = [
    { name: 'icon_16x16.png', size: 16 },
    { name: 'icon_16x16@2x.png', size: 32 },
    { name: 'icon_32x32.png', size: 32 },
    { name: 'icon_32x32@2x.png', size: 64 },
    { name: 'icon_64x64.png', size: 64 },
    { name: 'icon_64x64@2x.png', size: 128 },
    { name: 'icon_128x128.png', size: 128 },
    { name: 'icon_128x128@2x.png', size: 256 },
    { name: 'icon_256x256.png', size: 256 },
    { name: 'icon_256x256@2x.png', size: 512 },
    { name: 'icon_512x512.png', size: 512 },
    { name: 'icon_512x512@2x.png', size: 1024 },
  ];

  for (const file of iconsetFiles) {
    await sharp(svgBuffer, { density: 300 })
      .resize(file.size, file.size)
      .png()
      .toFile(join(iconsetDir, file.name));
  }

  console.log(`Generated iconset at: ${iconsetDir}`);
  console.log('Run: iconutil -c icns src-tauri/icons/AppIcon.iconset -o src-tauri/icons/icon.icns');
}

async function main() {
  console.log('Generating icons from:', svgPath);

  // Generate Tauri PNG icons
  for (const icon of tauriIcons) {
    await generatePng(join(iconsDir, icon.name), icon.size);
  }

  // Generate ICO for Windows
  await generateIco(join(iconsDir, 'icon.ico'));

  // Generate ICNS setup for macOS
  await generateIcns(join(iconsDir, 'icon.icns'));

  // Copy SVG to public folder for web favicon
  const svgContent = readFileSync(svgPath, 'utf-8');
  writeFileSync(join(publicDir, 'qr-foundry.svg'), svgContent);
  console.log(`Copied SVG to: ${join(publicDir, 'qr-foundry.svg')}`);

  // Generate a 32x32 PNG favicon for public
  await generatePng(join(publicDir, 'favicon.png'), 32);

  console.log('\nDone! Now run the following to create the macOS .icns file:');
  console.log('iconutil -c icns src-tauri/icons/AppIcon.iconset -o src-tauri/icons/icon.icns');
}

main().catch(console.error);
