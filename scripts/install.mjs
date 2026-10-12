import { cp, mkdir, access, rename, rm, mkdtemp } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const option = key => { const index = args.indexOf(key); return index >= 0 ? args[index + 1] : undefined; };
const agent = option('--agent');
const project = option('--project');
const allowed = new Set(['--agent', '--project', '--force']);
if (!['codex', 'claude', 'all'].includes(agent) || (args.includes('--project') && (!project || project.startsWith('--'))) || args.some(value => value.startsWith('--') && !allowed.has(value))) {
  console.error('Usage: node scripts/install.mjs --agent codex|claude|all [--project <directory>] [--force]');
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
    if (!args.includes('--force')) throw new Error(`Already installed: ${target.path}. Use --force to replace it.`);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
for (const target of targets) {
  await mkdir(dirname(target.path), { recursive: true });
  const staging = await mkdtemp(join(dirname(target.path), '.vanilla-diagram-'));
  let backup;
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
      if (backup) await rename(join(backup, 'previous'), target.path);
      throw error;
    }
    console.log(`Installed for ${target.name}: ${target.path}`);
  } finally {
    await rm(staging, { recursive: true, force: true });
    if (backup) await rm(backup, { recursive: true, force: true });
  }
}
