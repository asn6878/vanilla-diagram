import { cp, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const destination = process.argv[2];
if (!destination || destination.startsWith('-')) {
  console.error('Usage: node scripts/create.mjs <new-output-directory>');
  process.exit(1);
}
const target = resolve(destination);
try { await access(target); console.error(`Directory already exists: ${target}`); process.exit(1); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const source = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/starter');
await mkdir(dirname(target), { recursive: true });
await cp(source, target, { recursive: true, errorOnExist: true, force: false });
console.log(`Created ${target}. Edit scene.js, then serve the directory over HTTP.`);
