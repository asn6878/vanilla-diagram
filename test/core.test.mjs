import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { advance } from '../assets/starter/diagram.js';

test('logical time wraps in either direction and respects playback rate', () => {
  assert.deepEqual(advance(11, 1, 12, 2, 1), { time: 1, ended: false });
  assert.deepEqual(advance(0.5, 1, 12, 2, -1), { time: 10.5, ended: false });
  assert.deepEqual(advance(3, 1, 12, 0.5, -1), { time: 2.5, ended: false });
});
test('one-shot playback holds exact endpoints in both directions', () => {
  assert.deepEqual(advance(11, 1, 12, 2, 1, false), { time: 12, ended: true });
  assert.deepEqual(advance(1, 1, 12, 2, -1, false), { time: 0, ended: true });
});
test('the first frame preserves a seeked endpoint before time advances', () => {
  assert.deepEqual(advance(12, 0, 12, 1, -1), { time: 12, ended: false });
});
test('installed skills include everything needed to create a standalone output', async () => {
  const project = await mkdtemp(join(tmpdir(), 'vanilla-diagram-'));
  try {
    execFileSync(process.execPath, ['scripts/install.mjs', '--agent', 'all', '--project', project]);
    for (const prefix of ['.agents', '.claude']) {
      const skill = join(project, prefix, 'skills/vanilla-diagram');
      for (const file of ['SKILL.md', 'references/design.md', 'references/api.md', 'assets/starter/diagram.js', 'assets/starter/helpers.js', 'scripts/create.mjs']) await access(join(skill, file));
      const output = join(project, `${prefix.slice(1)}-output`);
      execFileSync(process.execPath, [join(skill, 'scripts/create.mjs'), output]);
      assert.match(await readFile(join(output, 'index.html'), 'utf8'), /type="module"/);
      await access(join(output, 'helpers.js'));
    }
    assert.throws(() => execFileSync(process.execPath, ['scripts/install.mjs', '--agent', 'codex', '--project', project], { stdio: 'pipe' }));
    execFileSync(process.execPath, ['scripts/install.mjs', '--agent', 'all', '--project', project, '--force']);
    await access(join(project, '.agents/skills/vanilla-diagram/SKILL.md'));
    await access(join(project, '.claude/skills/vanilla-diagram/SKILL.md'));
  } finally { await rm(project, { recursive: true, force: true }); }
});
