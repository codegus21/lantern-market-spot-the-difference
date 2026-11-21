// main.ts — hands the Lantern Market entry in.
// Copies game/ and screenshots/ from this repository into the output
// directory (MAKEFUN_OUTPUT_DIR, or /output on the grader) and writes
// /output/dossier.json with buildDossier from vendor/makefun-game.ts.
//
// Rules this program follows:
// - It never deletes the output directory itself, only the entries
//   inside it, so it is safe when /output is a mounted volume.
// - Its output is deterministic: the same repository always produces
//   the same dossier bytes.
// - When the repository has no screenshots/ yet (local testing before
//   the screenshot session runs), it writes one tiny generated
//   placeholder PNG into the output so buildDossier can still run and
//   the rest of the pipeline can be checked. The real entry always
//   carries real screenshots taken from the game itself.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { buildDossier } from './vendor/makefun-game.ts';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

// The output directory: the grader's /output, or MAKEFUN_OUTPUT_DIR
// when set for a local run.
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
// The repository root is the directory this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// --- minimal PNG writer (placeholder only, local testing) ---

const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBytes, Buffer.from(data)]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

// A tiny solid-colour PNG (8x8, dark plum) used only as a stand-in
// while the repository has no real screenshots yet.
function placeholderPng(): Buffer {
  const width = 8;
  const height = 8;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const row = Buffer.alloc(1 + width * 3, 0);
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = 0x1a;
    row[1 + x * 3 + 1] = 0x12;
    row[1 + x * 3 + 2] = 0x26;
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const idat = deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', new Uint8Array(0)),
  ]);
}

// --- hand-in ---

// Clear the output directory's children, never the directory itself.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

const gameDir = join(repoRoot, 'game');
if (!existsSync(gameDir)) throw new Error(`game/ not found in ${repoRoot}`);
cpSync(gameDir, join(outDir, 'game'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
} else {
  // Local testing only: the screenshot session adds real renders later.
  console.warn('WARNING: no screenshots/ in the repository — writing a placeholder PNG for a local test run only.');
  const outShots = join(outDir, 'screenshots');
  mkdirSync(outShots, { recursive: true });
  writeFileSync(join(outShots, '0-placeholder.png'), placeholderPng());
}

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_CAPS));
console.log(`Wrote ${join(outDir, 'dossier.json')}`);
