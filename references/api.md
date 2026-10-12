# Scene and player API

The browser loads ES modules. Import `mount` from `diagram.js`, import a scene, and call `mount('#diagram', scene)`. Load `diagram.css` first. No framework or runtime dependency is required.

```js
export default {
  title: 'A handoff',
  caption: 'The receiver processes a value from the sender.',
  alt: 'A value travels from the sender to the receiver and is processed.',
  duration: 12,
  height: width => width < 520 ? 320 : 260,
  // Optional: autoplay: false, loop: false, poster: 10
  draw(f, t) {
    const phase = f.phase([0, 2, 6, 10]);
    f.note(['Prepare', 'Transfer', 'Process', 'Complete'][phase.i]);
    // Draw a frame from t and fixed data.
  },
};
```

`duration` is a positive number of logical seconds. `height` is a pixel height or a width-to-height function. `poster` is the reduced-motion still frame; it defaults to the final frame. `autoplay: false` starts paused. `loop: false` stops at either endpoint.

## Frame context

`f.w`, `f.h`: stage dimensions in CSS pixels. `f.narrow`: width below 520px. `f.t`, `f.dur`: time and duration. `f.ctx`: Canvas 2D context for shapes not covered by helpers.

| Helper | Use |
| --- | --- |
| `f.span(a, b)` | Progress from 0 to 1 between times a and b |
| `f.phase([starts])` | Current phase `{ i, p }` |
| `f.ease(p)`, `f.inout(p)` | Ease-out and smooth travel |
| `f.lerp(a, b, p)`, `f.clamp(value, min, max)` | Numeric interpolation and limits |
| `f.note(text)` | Set the visible phase note |
| `f.tone(name, step)` | Palette base or tint 1 / 2 |
| `f.along(points, p)` | Point `{ x, y, i, a }` along a polyline |

Colors are available through `f.c`: neutrals and all ten palette names, with `1` / `2` suffixes for tints. `f.c.accent` aliases blue.

## Drawing helpers

- `text(text, x, y, { size, weight, mono, color, align, base, alpha })`: default size 12.5px, baseline middle. `measure(text, options)` returns pixel width.
- `rect(x, y, w, h, { r, fill, stroke, width, alpha })`: rounded rectangle.
- `panel(x, y, w, h, { label })`: neutral container.
- `node(x, y, w, h, { label, sub, subColor, on, tone, fill, mono, size, r, alpha })`: participant. Keep `on: 1` for a persistent identity; `fill: 2` for its wash and `fill: 1` while active. `subColor` defaults to muted; use `f.c.text` on tinted fills.
- `line(points, { color, width, dash, alpha, upto })` and `arrow(points, options)`: polyline and open arrowhead. `upto` is fractional progress.
- `dot(x, y, { r, color, ring, alpha })`: moving token; ring defaults to card color.
- `pill(text, x, y, { tone, align, alpha })`: small tag.
- `legend([{ label, tone }], x, y)`: labeled identity dots.
- `code(source, x, y, { lang, size, lh, active, w, dim, alpha })`: syntax-colored code. Source is a string or line array; `(x, y)` is the left edge and first line's middle. `active` is a zero-based line index or array. Returns `{ w, h }`.

Supported code languages: js, ts, java, kotlin, c, cpp, go, python, sql, bash, json. Other languages use plain text. Keep code faithful to the user's source.

## Charts

```js
const chart = f.plot({ x: 40, y: 60, w: f.w - 100, h: 160, xd: [0, 6], yd: [0, 64] });
chart.axes({ xt: [0, 2, 4, 6], yt: [0, 32, 64] });
const tip = chart.line(data, { tone: 'blue', upto: f.span(1, 9), area: true });
```

Data is sorted `[x, y]` pairs. `chart.sx(value)` / `sy(value)` map values to pixels. `axes` accepts `fx` / `fy` formatting functions. `line` returns its end `{ x, y, vx, vy }`, or null before any point. Put labels close to line ends and identify computed or illustrative data.

## Player

`mount(elementOrSelector, scene)` returns a player:

- `play()`, `pause()`
- `seek(seconds)` — clamp to the duration, draw, and pause
- `setPlaybackRate(rate)` — 0.25, 0.5, 1, 1.5, or 2; preserve position and pause state
- `setDirection(1 | -1)` — forward or reverse; preserve position
- `destroy()` — remove the diagram and release listeners and observers

Read-only use of `time`, `duration`, `rate`, and `direction` is useful for embedding. Change them through the methods. Scene errors pause that diagram. Mount once per host or destroy the previous player first. Reuse the same kit across scenes.
