import { drawingHelpers, clamp } from './helpers.js';

export const playbackRates = Object.freeze([0.25, 0.5, 1, 1.5, 2]);
const colors = 'blue cyan indigo violet pink red orange amber green slate'.split(' ');
const activePlayers = new WeakMap();

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function readTheme(host) {
  const css = getComputedStyle(host);
  const token = name => css.getPropertyValue(`--vd-${name}`).trim();
  const c = Object.fromEntries('bg soft text strong muted line grid'.split(' ').map(n => [n, token(n)]));
  for (const name of colors) for (const suffix of ['', '1', '2']) {
    c[name + suffix] = token(name + (suffix ? `-${suffix}` : ''));
  }
  c.accent = c.blue;
  return {
    c, wash: Number(token('wash')) || 0.14,
    sans: token('sans') || 'sans-serif', mono: token('mono') || 'monospace',
    syn: Object.fromEntries('kw str num fn type cm'.split(' ').map(n => [n, token(`code-${n}`)])),
  };
}

/** Advance logical time without depending on previous draws. */
export function advance(time, delta, duration, rate = 1, direction = 1, loop = true) {
  if (delta === 0) return { time: clamp(time, 0, duration), ended: false };
  const next = time + delta * rate * direction;
  const ended = direction > 0 ? next >= duration : next <= 0;
  if (!loop) return { time: clamp(next, 0, duration), ended };
  return { time: ((next % duration) + duration) % duration, ended: false };
}

/** Mount a scene and return its player. Load diagram.css before mounting. */
export function mount(target, scene) {
  const host = typeof target === 'string' ? document.querySelector(target) : target;
  if (!(host instanceof HTMLElement)) throw new TypeError('A diagram needs a valid host element.');
  if (activePlayers.has(host)) throw new Error('This host already has a diagram. Destroy it before mounting again.');
  if (typeof scene?.draw !== 'function' || !Number.isFinite(scene.duration) || scene.duration <= 0) {
    throw new TypeError('A scene needs draw(f, t) and a positive duration in seconds.');
  }
  const player = new Player(host, scene);
  activePlayers.set(host, player);
  return player;
}

class Player {
  constructor(host, scene) {
    this.host = host;
    this.scene = scene;
    this.duration = scene.duration;
    this.rate = 1;
    this.direction = 1;
    this.visible = false;
    this.destroyed = false;
    this.frame = 0;
    this.last = null;
    this.events = new AbortController();
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.scheme = matchMedia('(prefers-color-scheme: dark)');
    this.time = this.motion.matches ? clamp(scene.poster ?? this.duration, 0, this.duration) : 0;
    this.paused = this.motion.matches || scene.autoplay === false;
    this.parked = this.motion.matches;
    const listen = (node, name, fn) => node.addEventListener(name, fn, { signal: this.events.signal });

    this.root = element('figure', 'vd');
    const card = element('div', 'vd-card');
    const header = element('div', 'vd-header');
    header.append(element('span', 'vd-title', scene.title || 'Diagram'));
    const controls = element('div', 'vd-controls');
    const speeds = element('div', 'vd-speeds');
    speeds.setAttribute('role', 'group');
    speeds.setAttribute('aria-label', 'Playback speed');
    this.speedButtons = playbackRates.map(rate => {
      const button = element('button', 'vd-speed', `${rate}×`);
      button.type = 'button';
      button.dataset.rate = rate;
      button.setAttribute('aria-label', `${rate}× speed`);
      listen(button, 'click', () => this.setPlaybackRate(rate));
      speeds.append(button);
      return button;
    });
    this.reverseButton = element('button', 'vd-button vd-reverse', '↶');
    this.reverseButton.type = 'button';
    this.reverseButton.title = 'Reverse playback';
    this.reverseButton.setAttribute('aria-label', 'Reverse playback');
    this.playButton = element('button', 'vd-button vd-play');
    this.playButton.type = 'button';
    controls.append(speeds, this.reverseButton, this.playButton);
    header.append(controls);
    const stage = element('div', 'vd-stage');
    this.canvas = element('canvas', 'vd-canvas');
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', scene.alt || scene.caption || scene.title || 'Animated diagram');
    stage.append(this.canvas);
    this.note = element('p', 'vd-note');
    const timeline = element('div', 'vd-timeline');
    this.range = element('input', 'vd-range');
    this.range.type = 'range';
    this.range.min = '0';
    this.range.max = String(this.duration);
    this.range.step = '0.01';
    this.range.setAttribute('aria-label', 'Playback position');
    this.clock = element('output', 'vd-clock');
    timeline.append(this.range, this.clock);
    card.append(header, stage, this.note, timeline);
    this.root.append(card);
    if (scene.caption) this.root.append(element('figcaption', 'vd-caption', scene.caption));
    host.append(this.root);
    this.f = Object.create(drawingHelpers);
    this.f.ctx = this.canvas.getContext('2d');
    if (!this.f.ctx) throw new Error('A 2D canvas context is required.');

    listen(this.playButton, 'click', () => this.paused ? this.play() : this.pause());
    listen(this.reverseButton, 'click', () => this.setDirection(-this.direction));
    listen(this.range, 'input', () => this.seek(Number(this.range.value)));
    listen(this.range, 'keydown', event => {
      const next = event.key === 'ArrowRight' ? this.time + 0.25
        : event.key === 'ArrowLeft' ? this.time - 0.25
        : event.key === 'Home' ? 0 : event.key === 'End' ? this.duration : null;
      if (next !== null) { event.preventDefault(); this.seek(next); }
    });
    listen(document, 'visibilitychange', () => this.sync());
    listen(this.motion, 'change', () => {
      if (this.motion.matches) this.seek(scene.poster ?? this.duration);
    });
    listen(this.scheme, 'change', () => this.draw());
    this.themeObserver = new MutationObserver(() => this.draw());
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(stage);
    this.intersectionObserver = new IntersectionObserver(entries => {
      this.visible = entries[0].isIntersecting;
      this.sync();
    });
    this.intersectionObserver.observe(this.root);
    if (document.fonts) listen(document.fonts, 'loadingdone', () => this.draw());
    this.tick = now => {
      const delta = this.last === null ? 0 : Math.min((now - this.last) / 1000, 0.15);
      this.last = now;
      const next = advance(this.time, delta, this.duration, this.rate, this.direction, scene.loop !== false);
      this.time = next.time;
      if (next.ended) this.paused = true;
      this.draw();
      this.frame = this.running() ? requestAnimationFrame(this.tick) : 0;
    };
    this.resize();
    this.paintControls();
  }
  running() { return !this.destroyed && !this.broken && this.visible && !this.paused && !document.hidden; }
  sync() {
    this.last = null;
    if (this.running() && !this.frame) this.frame = requestAnimationFrame(this.tick);
    else if (!this.running() && this.frame) { cancelAnimationFrame(this.frame); this.frame = 0; }
  }
  play() {
    if (this.destroyed || this.broken) return;
    if (this.parked || (this.direction === 1 && this.time >= this.duration) || (this.direction === -1 && this.time <= 0)) {
      this.time = this.direction === 1 ? 0 : this.duration;
    }
    this.parked = false;
    this.paused = false;
    this.paintControls();
    this.sync();
  }
  pause() { this.paused = true; this.paintControls(); this.sync(); }
  seek(seconds) {
    if (!Number.isFinite(seconds)) throw new TypeError('Seek time must be a finite number.');
    this.time = clamp(seconds, 0, this.duration);
    this.parked = false;
    this.pause();
    this.draw();
  }
  setPlaybackRate(rate) {
    if (!playbackRates.includes(rate)) throw new RangeError('Unsupported playback speed.');
    this.rate = rate;
    this.last = null;
    this.paintControls();
  }
  setDirection(direction) {
    if (direction !== 1 && direction !== -1) throw new RangeError('Direction must be 1 or -1.');
    this.direction = direction;
    this.last = null;
    this.paintControls();
  }
  paintControls() {
    this.speedButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.rate) === this.rate)));
    this.reverseButton.setAttribute('aria-pressed', String(this.direction === -1));
    this.playButton.textContent = this.paused ? '▶' : 'Ⅱ';
    this.playButton.setAttribute('aria-label', this.paused ? 'Play' : 'Pause');
    this.playButton.title = this.paused ? 'Play' : 'Pause';
  }
  resize() {
    const width = Math.round(this.canvas.getBoundingClientRect().width);
    if (!width) return;
    const height = Math.round(typeof this.scene.height === 'function' ? this.scene.height(width) : this.scene.height || 280);
    this.dpr = Math.min(devicePixelRatio || 1, 3);
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.height = `${height}px`;
    this.f.w = width;
    this.f.h = height;
    this.draw();
  }
  draw() {
    if (this.destroyed || this.broken || !this.f.w) return;
    const f = this.f;
    Object.assign(f, readTheme(this.root), { t: this.time, dur: this.duration, narrow: f.w < 520, _note: '' });
    f.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    f.ctx.clearRect(0, 0, f.w, f.h);
    try { this.scene.draw(f, this.time); }
    catch (error) {
      this.broken = true;
      this.pause();
      this.note.textContent = `Unable to draw this scene: ${error.message}`;
      this.note.setAttribute('role', 'alert');
      console.error('[vanilla-diagram]', error);
      return;
    }
    this.note.textContent = f._note;
    this.range.value = String(this.time);
    this.range.setAttribute('aria-valuetext', `${this.time.toFixed(1)} of ${this.duration} seconds`);
    this.range.style.setProperty('--progress', `${this.time / this.duration * 100}%`);
    this.clock.textContent = `${this.time.toFixed(1)} / ${this.duration.toFixed(1)}s`;
    this.paintControls();
  }
  destroy() {
    this.pause();
    this.destroyed = true;
    this.events.abort();
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.themeObserver.disconnect();
    this.root.remove();
    activePlayers.delete(this.host);
  }
}
