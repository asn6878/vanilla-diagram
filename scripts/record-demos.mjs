import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const recordings = resolve(root, '.recordings');
const media = resolve(root, 'docs/media');
await mkdir(recordings, { recursive: true });
await mkdir(media, { recursive: true });
execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
const server = spawn(process.execPath, [resolve(root, 'scripts/serve.mjs'), '--port', '0'], { cwd: root });
const url = await new Promise((resolveUrl, reject) => {
  const timer = setTimeout(() => reject(new Error('Preview server did not start.')), 10000);
  server.stdout.on('data', chunk => {
    const match = String(chunk).match(/http:\/\/localhost:\d+/);
    if (match) { clearTimeout(timer); resolveUrl(match[0]); }
  });
  server.on('error', reject);
  server.on('exit', code => { if (code) reject(new Error(`Preview server exited with ${code}`)); });
});
const browser = await chromium.launch();
const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));

function encode(frames, output) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '15', '-i', resolve(frames, 'frame-%05d.png'),
    '-filter_complex', 'split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=none',
    '-loop', '0', output], { stdio: 'inherit' });
}

async function record(scene, controls = false) {
  const context = await browser.newContext({
    viewport: { width: 680, height: 540 }, deviceScaleFactor: 1, colorScheme: 'light',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${url}/examples/?scene=${scene}&record=${controls ? 'controls' : 'scene'}`);
  await page.locator('canvas').waitFor();
  await page.waitForFunction(() => Object.values(window.demoPlayers).every(player => player.f.w > 0 && player.visible));
  await page.screenshot({ path: resolve(recordings, `${scene}-initial.png`) });
  const label = text => page.locator('#record-label').evaluate((element, value) => { element.textContent = value; }, text);
  await label(controls ? 'Play at 1×' : scene === 'parcel' ? 'PROCESS · A PARCEL ROUTE' : 'COMPARISON · COMPUTED GROWTH');
  await sleep(350);
  const frames = resolve(recordings, `${scene}-${controls ? 'controls' : 'scene'}-frames`);
  await rm(frames, { recursive: true, force: true });
  await mkdir(frames);
  let capturing = true;
  let frame = 0;
  const start = Date.now();
  // Capture real browser pixels at 15 fps while the player and pointer actions run normally.
  // Lossless source frames keep labels sharp and avoid video start/stop padding.
  const capture = (async () => {
    while (capturing) {
      await page.screenshot({ path: resolve(frames, `frame-${String(frame++).padStart(5, '0')}.png`) });
      await sleep(Math.max(0, start + frame * 1000 / 15 - Date.now()));
    }
  })();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  if (controls) {
    await sleep(1500);
    await label('Speed up · 2×');
    await page.getByRole('button', { name: '2× speed', exact: true }).click();
    await sleep(1500);
    await label('Pause and inspect');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await sleep(650);
    const drag = async fraction => {
      const slider = page.getByRole('slider', { name: 'Playback position' });
      const box = await slider.boundingBox();
      const current = await slider.evaluate(node => Number(node.value) / Number(node.max));
      const x = value => box.x + 6 + value * (box.width - 12);
      await page.mouse.move(x(current), box.y + box.height / 2);
      await page.mouse.down();
      for (let i = 1; i <= 24; i++) {
        await page.mouse.move(x(current + (fraction - current) * i / 24), box.y + box.height / 2);
        await sleep(30);
      }
      await page.mouse.up();
    };
    await label('Scrub forward');
    await drag(0.88);
    await sleep(600);
    await label('Scrub backward');
    await drag(0.2);
    await sleep(600);
    await label('Resume · 0.5×');
    await page.getByRole('button', { name: '0.5× speed', exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await sleep(1500);
    await label('Reverse playback');
    await page.getByRole('button', { name: 'Reverse playback', exact: true }).click();
    const before = await page.evaluate(() => window.demoPlayers.parcel.time);
    await sleep(1400);
    const after = await page.evaluate(() => window.demoPlayers.parcel.time);
    if (after >= before) throw new Error('Reverse playback did not move backward.');
    await label('Reverse · 1.5×');
    await page.getByRole('button', { name: '1.5× speed', exact: true }).click();
    await sleep(1200);
    await label('Jump to the conclusion');
    await drag(1);
    await sleep(1500);
    const state = await page.evaluate(() => ({ time: window.demoPlayers.parcel.time, paused: window.demoPlayers.parcel.paused, rate: window.demoPlayers.parcel.rate }));
    if (!state.paused || state.time < 11.9 || state.rate !== 1.5) throw new Error('The timeline did not preserve playback state.');
  } else {
    await sleep(11600);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await sleep(300);
  }
  await page.screenshot({ path: resolve(recordings, `${scene}-${controls ? 'controls' : 'final'}.png`) });
  capturing = false;
  await capture;
  await context.close();
  if (errors.length) throw new Error(errors.join('\n'));
  const output = resolve(media, controls ? 'controls.gif' : scene === 'parcel' ? 'parcel-route.gif' : 'growth-curves.gif');
  encode(frames, output);
  console.log(`Recorded ${output}`);
}

try {
  await record('parcel');
  await record('growth');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', resolve(media, 'parcel-route.gif'), '-i', resolve(media, 'growth-curves.gif'),
    '-filter_complex', '[0:v][1:v]hstack=inputs=2:shortest=1,fps=15,split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=none',
    '-loop', '0', resolve(media, 'examples.gif')], { stdio: 'inherit' });
  await record('parcel', true);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
