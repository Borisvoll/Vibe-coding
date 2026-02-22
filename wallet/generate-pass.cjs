#!/usr/bin/env node
/**
 * Apple Wallet Pass Generator
 * Generates a .pkpass file for Boris Jan Vollebregt's portfolio card.
 *
 * Usage:
 *   node wallet/generate-pass.js
 *
 * Output:
 *   wallet/Boris_Jan_Vollebregt.pkpass (unsigned)
 *
 * To make it work on iOS you need to sign it with an Apple Developer certificate.
 * See README in this folder for instructions.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { execSync } = require('child_process');

const WALLET_DIR = __dirname;
const BUILD_DIR = path.join(WALLET_DIR, '.build');
const OUTPUT = path.join(WALLET_DIR, 'Boris_Jan_Vollebregt.pkpass');

// --- PNG Generator (solid color, no external deps) ---

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([length, typeBytes, data, crcVal]);
}

function createSolidPNG(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);   // bit depth
  ihdrData.writeUInt8(2, 9);   // color type RGB
  ihdrData.writeUInt8(0, 10);  // compression
  ihdrData.writeUInt8(0, 11);  // filter
  ihdrData.writeUInt8(0, 12);  // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // Raw image data: filter byte (0) + RGB pixels per row
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const offset = y * rowSize + 1 + x * 3;
      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
    }
  }
  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);

  // IEND
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createIconWithLetter(width, height, r, g, b, fr, fg, fb) {
  // Create a solid background with a centered lighter square as a simple "B" hint
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(2, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdr = createChunk('IHDR', ihdrData);

  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);

  const inset = Math.floor(width * 0.25);
  const innerSize = width - inset * 2;

  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0;
    for (let x = 0; x < width; x++) {
      const offset = y * rowSize + 1 + x * 3;
      const isInner = x >= inset && x < inset + innerSize && y >= inset && y < inset + innerSize;
      if (isInner) {
        rawData[offset] = fr;
        rawData[offset + 1] = fg;
        rawData[offset + 2] = fb;
      } else {
        rawData[offset] = r;
        rawData[offset + 1] = g;
        rawData[offset + 2] = b;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// --- Build Process ---

function clean() {
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true });
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}

function generateImages() {
  // Purple: rgb(88, 86, 214) — BORIS accent
  const bg = [88, 86, 214];
  const fg = [210, 210, 255];

  // icon.png — 29x29 (required)
  fs.writeFileSync(
    path.join(BUILD_DIR, 'icon.png'),
    createIconWithLetter(29, 29, ...bg, ...fg)
  );

  // icon@2x.png — 58x58
  fs.writeFileSync(
    path.join(BUILD_DIR, 'icon@2x.png'),
    createIconWithLetter(58, 58, ...bg, ...fg)
  );

  // icon@3x.png — 87x87
  fs.writeFileSync(
    path.join(BUILD_DIR, 'icon@3x.png'),
    createIconWithLetter(87, 87, ...bg, ...fg)
  );

  // logo.png — 160x50
  fs.writeFileSync(
    path.join(BUILD_DIR, 'logo.png'),
    createSolidPNG(160, 50, ...bg)
  );

  // logo@2x.png — 320x100
  fs.writeFileSync(
    path.join(BUILD_DIR, 'logo@2x.png'),
    createSolidPNG(320, 100, ...bg)
  );

  // thumbnail.png — 90x90 (optional, shown on lock screen)
  fs.writeFileSync(
    path.join(BUILD_DIR, 'thumbnail.png'),
    createIconWithLetter(90, 90, ...bg, ...fg)
  );

  // thumbnail@2x.png — 180x180
  fs.writeFileSync(
    path.join(BUILD_DIR, 'thumbnail@2x.png'),
    createIconWithLetter(180, 180, ...bg, ...fg)
  );

  console.log('  ✓ Generated icon, logo, and thumbnail PNGs');
}

function copyPassJSON() {
  const src = path.join(WALLET_DIR, 'pass.json');
  const dest = path.join(BUILD_DIR, 'pass.json');
  fs.copyFileSync(src, dest);
  console.log('  ✓ Copied pass.json');
}

function createManifest() {
  const manifest = {};
  const files = fs.readdirSync(BUILD_DIR).filter(f => f !== 'manifest.json' && f !== 'signature');

  for (const file of files) {
    const filePath = path.join(BUILD_DIR, file);
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha1').update(content).digest('hex');
    manifest[file] = hash;
  }

  fs.writeFileSync(
    path.join(BUILD_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('  ✓ Created manifest.json with SHA1 hashes');
  return manifest;
}

function packagePass() {
  if (fs.existsSync(OUTPUT)) {
    fs.unlinkSync(OUTPUT);
  }

  try {
    // Use zip command to create .pkpass (it's just a ZIP)
    execSync(`cd "${BUILD_DIR}" && zip -q "${OUTPUT}" *`);
    console.log(`  ✓ Packaged as ${path.basename(OUTPUT)}`);
  } catch {
    // Fallback: manual copy with instructions
    console.log('  ⚠ zip command not available. Creating directory bundle instead.');
    const bundleDir = OUTPUT.replace('.pkpass', '.pass');
    if (!fs.existsSync(bundleDir)) fs.mkdirSync(bundleDir);
    const files = fs.readdirSync(BUILD_DIR);
    for (const file of files) {
      fs.copyFileSync(path.join(BUILD_DIR, file), path.join(bundleDir, file));
    }
    console.log(`  ✓ Created ${path.basename(bundleDir)}/ directory bundle`);
    console.log('    → ZIP this directory and rename to .pkpass');
  }
}

// --- Main ---

console.log('\n🍎 Apple Wallet Pass Generator\n');
console.log('  Naam:    Boris Jan Vollebregt');
console.log('  Functie: Student Research Instrumentmaker');
console.log('  Email:   Borisvoll@hotmail.com');
console.log('  QR:      https://borisvoll.github.io/Vibe-coding/');
console.log('');

clean();
generateImages();
copyPassJSON();
createManifest();
packagePass();

// Cleanup build dir
fs.rmSync(BUILD_DIR, { recursive: true });

console.log('\n─────────────────────────────────────────────');
console.log('  📦 Klaar! Bestand: wallet/Boris_Jan_Vollebregt.pkpass');
console.log('');
console.log('  ⚠  Dit bestand is NIET gesigned.');
console.log('  Om het op een echte iPhone te gebruiken heb je nodig:');
console.log('');
console.log('  1. Apple Developer Account ($99/jaar)');
console.log('     → developer.apple.com/account');
console.log('  2. Pass Type ID certificaat aanmaken');
console.log('     → Certificates, IDs & Profiles → Pass Type IDs');
console.log('  3. Signing met signpass tool of passkit-generator npm package');
console.log('');
console.log('  Gratis alternatieven:');
console.log('  • https://wallet-passes.io (gratis .pkpass signing)');
console.log('  • https://www.passslot.com (gratis tier beschikbaar)');
console.log('  • Upload pass.json + images naar een van deze services');
console.log('─────────────────────────────────────────────\n');
