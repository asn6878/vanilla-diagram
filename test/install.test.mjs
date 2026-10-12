import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access, readdir, rm, symlink, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const installer = fileURLToPath(new URL('../scripts/install.mjs', import.meta.url));
const run = (args, imports = []) => spawnSync(process.execPath, [...imports.flatMap(path => ['--import', path]), installer, ...args], { encoding: 'utf8' });
const scratch = async t => {
  const directory = await mkdtemp(join(tmpdir(), 'vanilla-diagram-install-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
};
const skillPath = (directory, prefix = '.agents') => join(directory, prefix, 'skills/vanilla-diagram');

test('each agent receives a complete skill without installing the other agent', async t => {
  for (const [agent, prefix, other] of [['codex', '.agents', '.claude'], ['claude', '.claude', '.agents']]) {
    const directory = await scratch(t);
    const result = run(['--agent', agent, '--project', directory]);
    assert.equal(result.status, 0, result.stderr);
    const skill = skillPath(directory, prefix);
    for (const file of ['SKILL.md', 'agents/openai.yaml', 'assets/brand/logo.png', 'assets/brand/logo.svg', 'references/design.md', 'references/api.md', 'assets/starter/index.html', 'assets/starter/diagram.css', 'assets/starter/scene.js', 'scripts/create.mjs', 'scripts/serve.mjs', 'LICENSE']) await access(join(skill, file));
    for (const excluded of [other, join(prefix, 'skills/vanilla-diagram/docs'), join(prefix, 'skills/vanilla-diagram/node_modules')]) {
      await assert.rejects(access(join(directory, excluded)), { code: 'ENOENT' });
    }
    const output = join(directory, 'output');
    const generated = spawnSync(process.execPath, [join(skill, 'scripts/create.mjs'), output], { encoding: 'utf8' });
    assert.equal(generated.status, 0, generated.stderr);
    for (const file of ['index.html', 'scene.js', 'diagram.js', 'diagram.css', 'helpers.js']) await access(join(output, file));
  }
});

test('personal installs use the documented home paths', async t => {
  const directory = await scratch(t);
  const hook = join(directory, 'home.mjs');
  // Isolate homedir() inside the child process without changing the user's environment.
  await writeFile(hook, `import os from 'node:os';\nimport { syncBuiltinESMExports } from 'node:module';\nos.homedir = () => ${JSON.stringify(directory)};\nsyncBuiltinESMExports();\n`);
  const result = run(['--agent', 'all'], [hook]);
  assert.equal(result.status, 0, result.stderr);
  await access(join(skillPath(directory), 'SKILL.md'));
  await access(join(skillPath(directory, '.claude'), 'SKILL.md'));
});

test('invalid arguments are rejected before installation', async t => {
  const directory = await scratch(t);
  for (const args of [
    ['--agent', 'codex', '--project', directory, 'unexpected'],
    ['--agent', 'codex', '--project'],
    ['--agent', 'codex', '--project', directory, '--unknown'],
    ['--agent', 'other', '--project', directory],
    ['--agent', 'codex', '--project='],
    ['--agent', 'codex', '--project', directory, '--force=false'],
  ]) {
    const result = run(args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Usage:/);
  }
  await assert.rejects(access(join(directory, '.agents')), { code: 'ENOENT' });
  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
});

test('existing installs stay intact without force and are replaced with force', async t => {
  const directory = await scratch(t);
  const skill = skillPath(directory);
  await mkdir(skill, { recursive: true });
  await writeFile(join(skill, 'old.txt'), 'previous installation');
  const rejected = run(['--agent', 'codex', '--project', directory]);
  assert.notEqual(rejected.status, 0);
  assert.equal(await readFile(join(skill, 'old.txt'), 'utf8'), 'previous installation');
  const replaced = run(['--agent', 'codex', '--project', directory, '--force']);
  assert.equal(replaced.status, 0, replaced.stderr);
  await access(join(skill, 'SKILL.md'));
  await assert.rejects(access(join(skill, 'old.txt')), { code: 'ENOENT' });
  assert.deepEqual(await readdir(join(directory, '.agents/skills')), ['vanilla-diagram']);
});

test('force replaces an installed symlink without deleting its source', async t => {
  const directory = await scratch(t);
  const previous = join(directory, 'linked-skill');
  await mkdir(previous);
  await writeFile(join(previous, 'keep.txt'), 'shared source');
  const skill = skillPath(directory);
  await mkdir(join(directory, '.agents/skills'), { recursive: true });
  await symlink(previous, skill, 'dir');
  const result = run(['--agent', 'codex', '--project', directory, '--force']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal((await lstat(skill)).isSymbolicLink(), false);
  assert.equal(await readFile(join(previous, 'keep.txt'), 'utf8'), 'shared source');
  await access(join(skill, 'SKILL.md'));
});

const failureHook = async (directory, failRestore) => {
  const hook = join(directory, 'rename-failure.mjs');
  await writeFile(hook, `import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
const rename = fs.promises.rename;
fs.promises.rename = async (from, to) => {
  if (${failRestore} && String(from).endsWith('/previous')) throw new Error('Simulated restore failure');
  if (String(from).includes('/.vanilla-diagram-') && !String(from).includes('/.vanilla-diagram-backup-')) throw new Error('Simulated replacement failure');
  return rename(from, to);
};
syncBuiltinESMExports();
`);
  return hook;
};

test('replacement failure restores the previous install', async t => {
  const directory = await scratch(t);
  const skill = skillPath(directory);
  await mkdir(skill, { recursive: true });
  await writeFile(join(skill, 'keep.txt'), 'previous installation');
  const result = run(['--agent', 'codex', '--project', directory, '--force'], [await failureHook(directory, false)]);
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(join(skill, 'keep.txt'), 'utf8'), 'previous installation');
  assert.deepEqual(await readdir(join(directory, '.agents/skills')), ['vanilla-diagram']);
});

test('a failed rollback preserves the previous install and reports its recovery path', async t => {
  const directory = await scratch(t);
  const skill = skillPath(directory);
  await mkdir(skill, { recursive: true });
  await writeFile(join(skill, 'keep.txt'), 'previous installation');
  const result = run(['--agent', 'codex', '--project', directory, '--force'], [await failureHook(directory, true)]);
  assert.notEqual(result.status, 0);
  const parent = join(directory, '.agents/skills');
  const entries = await readdir(parent);
  assert.equal(entries.length, 1);
  assert.ok(entries[0].startsWith('.vanilla-diagram-backup-'));
  const recovery = join(parent, entries[0], 'previous');
  assert.equal(await readFile(join(recovery, 'keep.txt'), 'utf8'), 'previous installation');
  assert.ok(result.stderr.includes(recovery), result.stderr);
});

test('all-agent preflight refuses existing installs before creating another agent install', async t => {
  const directory = await scratch(t);
  const skill = skillPath(directory, '.claude');
  await mkdir(skill, { recursive: true });
  await writeFile(join(skill, 'keep.txt'), 'existing Claude install');
  const result = run(['--agent', 'all', '--project', directory]);
  assert.notEqual(result.status, 0);
  await assert.rejects(access(join(directory, '.agents')), { code: 'ENOENT' });
  assert.equal(await readFile(join(skill, 'keep.txt'), 'utf8'), 'existing Claude install');
});
