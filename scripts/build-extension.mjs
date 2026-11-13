import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const extSrcDir = path.join(rootDir, 'src', 'extension');
const outDir = path.join(rootDir, 'dist-extension');
const publicDir = path.join(rootDir, 'public');

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createExtensionIconPng(size) {
  const width = size;
  const height = size;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  const radius = Math.max(2, Math.round(size * 0.22));

  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;

    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      const dx = Math.max(0, radius - x, x - (width - 1 - radius));
      const dy = Math.max(0, radius - y, y - (height - 1 - radius));
      const inRoundedRect = dx * dx + dy * dy <= radius * radius;

      if (!inRoundedRect) {
        raw[px] = 0;
        raw[px + 1] = 0;
        raw[px + 2] = 0;
        raw[px + 3] = 0;
        continue;
      }

      const nx = x / width;
      const ny = y / height;
      const inTopBar = nx >= 0.24 && nx <= 0.76 && ny >= 0.34 && ny <= 0.44;
      const inBottomBar = nx >= 0.24 && nx <= 0.62 && ny >= 0.56 && ny <= 0.66;

      if (inTopBar || inBottomBar) {
        raw[px] = 255;
        raw[px + 1] = 255;
        raw[px + 2] = 255;
        raw[px + 3] = 255;
      } else {
        raw[px] = 220;
        raw[px + 1] = 38;
        raw[px + 2] = 38;
        raw[px + 3] = 255;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function toDosDateTime(dateInput) {
  const d = dateInput instanceof Date && !Number.isNaN(dateInput.getTime())
    ? dateInput
    : new Date(2026, 0, 1, 12, 0, 0);
  const year = Math.min(2107, Math.max(1980, d.getFullYear()));
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = Math.floor(d.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosTime, dosDate };
}

function collectEntries(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  let items = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const stat = fs.statSync(full);
    if (entry.isDirectory()) {
      items.push({ full, rel: `${rel}/`, isDir: true, mtime: stat.mtime });
      items = items.concat(collectEntries(full, rel));
    } else {
      items.push({ full, rel, isDir: false, mtime: stat.mtime });
    }
  }
  return items;
}

function createZipArchive(sourceDir, outZipPath) {
  const entries = collectEntries(sourceDir);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const data = entry.isDir ? Buffer.alloc(0) : fs.readFileSync(entry.full);
    const compressed = entry.isDir ? Buffer.alloc(0) : zlib.deflateRawSync(data);
    const method = entry.isDir ? 0 : 8;
    const nameBuf = Buffer.from(entry.rel, 'utf8');
    const crc = entry.isDir ? 0 : crc32(data);
    const { dosTime, dosDate } = toDosDateTime(entry.mtime);
    const flags = 0x0800; // UTF-8 filename encoding
    // Unix (3) + spec 2.0 (20) -> 0x0314; upper 16 bits Unix mode, lower 16 bits DOS attr
    const versionMadeBy = 0x0314;
    const externalAttr = entry.isDir
      ? ((0o040755 << 16) | 0x10) >>> 0
      : ((0o100644 << 16) | 0x20) >>> 0;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed to extract (2.0)
    localHeader.writeUInt16LE(flags, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(versionMadeBy, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(flags, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(externalAttr, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirBuf.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  fs.mkdirSync(path.dirname(outZipPath), { recursive: true });
  fs.writeFileSync(outZipPath, Buffer.concat([...localParts, centralDirBuf, endRecord]));
}

async function main() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const tempPopupDir = path.join(outDir, '_popup_tmp');
  await viteBuild({
    configFile: false,
    root: extSrcDir,
    base: './',
    plugins: [react(), tailwindcss()],
    build: {
      outDir: tempPopupDir,
      emptyOutDir: true,
      rollupOptions: {
        input: path.join(extSrcDir, 'popup.html'),
        output: {
          entryFileNames: 'popup.js',
          chunkFileNames: 'chunks/[name].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'popup.css';
            }
            return 'assets/[name][extname]';
          },
        },
      },
    },
    logLevel: 'silent',
  });

  for (const item of fs.readdirSync(tempPopupDir)) {
    fs.renameSync(path.join(tempPopupDir, item), path.join(outDir, item));
  }
  fs.rmSync(tempPopupDir, { recursive: true, force: true });

  const builtPopupHtmlPath = path.join(outDir, 'popup.html');
  let popupHtml = fs.readFileSync(builtPopupHtmlPath, 'utf8');
  popupHtml = popupHtml.replace(/\s+crossorigin/g, '');
  popupHtml = popupHtml.replace(/href="\.\/popup\.css"/g, 'href="popup.css"');
  popupHtml = popupHtml.replace(/src="\.\/popup\.js"/g, 'src="popup.js"');
  fs.writeFileSync(builtPopupHtmlPath, popupHtml);

  const builtPopupCssPath = path.join(outDir, 'popup.css');
  const builtPopupCss = fs.readFileSync(builtPopupCssPath, 'utf8');
  if (!builtPopupCss.includes('.flex') || !builtPopupCss.includes('.bg-red-600')) {
    throw new Error('Compiled popup.css is missing Tailwind utility classes!');
  }

  await esbuild.build({
    entryPoints: [path.join(extSrcDir, 'background.ts')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['chrome114', 'edge114'],
    outfile: path.join(outDir, 'background.js'),
    minify: false,
  });

  await esbuild.build({
    entryPoints: [path.join(extSrcDir, 'contentScript.ts')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome114', 'edge114'],
    outfile: path.join(outDir, 'contentScript.js'),
    minify: false,
  });

  fs.copyFileSync(
    path.join(extSrcDir, 'manifest.json'),
    path.join(outDir, 'manifest.json'),
  );

  const srcIconsDir = path.join(extSrcDir, 'icons');
  const iconsDir = path.join(outDir, 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });
  for (const size of [16, 48, 128]) {
    const customIconPath = path.join(srcIconsDir, `icon${size}.png`);
    const destIconPath = path.join(iconsDir, `icon${size}.png`);
    if (fs.existsSync(customIconPath)) {
      fs.copyFileSync(customIconPath, destIconPath);
    } else {
      fs.writeFileSync(destIconPath, createExtensionIconPng(size));
    }
  }

  const zipPath = path.join(publicDir, 'channelsweep-for-youtube.zip');
  createZipArchive(outDir, zipPath);

  console.log(`Built Manifest V3 extension into ${outDir}`);
  console.log(`Packaged downloadable ZIP at ${zipPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
