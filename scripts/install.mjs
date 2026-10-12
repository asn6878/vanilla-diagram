import { cp, mkdir, access, rename, rm, mkdtemp } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const usage = 'Usage: node scripts/install.mjs --agent codex|claude|all [--project <directory>] [--force]';
let options;
try {
  options = parseArgs({
    options: { agent: { type: 'string' }, project: { type: 'string' }, force: { type: 'boolean' }, help: { type: 'boolean' } },
    allowPositionals: false,
  }).values;
} catch (error) {
  console.error(error.message);
  console.error(usage);
  process.exit(1);
}
if (options.help) { console.log(usage); process.exit(0); }
const { agent, project, force } = options;
if (!['codex', 'claude', 'all'].includes(agent) || (project !== undefined && !project)) {
  console.error(usage);
  process.exit(1);
}
const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = project ? resolve(project) : homedir();
const targets = (agent === 'all' ? ['codex', 'claude'] : [agent]).map(name => ({
  name, path: join(base, name === 'codex' ? '.agents' : '.claude', 'skills', 'vanilla-diagram'),
}));
for (const target of targets) {
  try {
    await access(target.path);
    if (!force) throw new Error(`Already installed: ${target.path}. Use --force to replace it.`);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
for (const target of targets) {
  await mkdir(dirname(target.path), { recursive: true });
  const staging = await mkdtemp(join(dirname(target.path), '.vanilla-diagram-'));
  let backup;
  let preserveBackup = false;
  try {
    for (const file of ['SKILL.md', 'assets', 'references', 'agents', 'LICENSE']) {
      await cp(join(source, file), join(staging, file), { recursive: true });
    }
    await mkdir(join(staging, 'scripts'));
    for (const file of ['create.mjs', 'serve.mjs']) await cp(join(source, 'scripts', file), join(staging, 'scripts', file));
    try {
      await access(target.path);
      backup = await mkdtemp(join(dirname(target.path), '.vanilla-diagram-backup-'));
      await rename(target.path, join(backup, 'previous'));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await rename(staging, target.path); }
    catch (error) {
      if (backup) {
        try { await rename(join(backup, 'previous'), target.path); }
        catch (restoreError) {
          preserveBackup = true;
          throw new Error(`Installation and rollback failed. Recover the previous installation from ${join(backup, 'previous')}.`, { cause: restoreError });
        }
      }
      throw error;
    }
    console.log(`Installed for ${target.name}: ${target.path}`);
  } finally {
    await rm(staging, { recursive: true, force: true });
    if (backup && !preserveBackup) await rm(backup, { recursive: true, force: true });
  }
}
