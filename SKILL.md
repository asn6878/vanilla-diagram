---
name: vanilla-diagram
description: Create or revise clear animated infographics and explanatory diagrams in vanilla JavaScript and Canvas. Use for visual explanations of processes, handoffs, algorithms, or changes over time, with inspectable playback controls.
---

# Vanilla Infographics

Turn the user's explanation into an infographic that can be played, paused, and explored in either direction. Deliver plain HTML, CSS, and JavaScript using the bundled Canvas player.

## Build the explanation

- Identify what the viewer should understand. Choose a flow, sequence, comparison, chart, or another arrangement that fits the content. Preserve the user's requested language, style, and output location.
- Treat the examples and starter styling as starting points. Follow the user's requested composition, shapes, typography, colors, and motion; revise them through follow-up requests. Adapt the surrounding HTML and CSS when needed while preserving usable playback controls.
- Sketch the meaningful states and transitions before drawing. A short caption states the outcome; each phase has a short note that also makes sense while paused.
- Use supplied data or a stated, reproducible calculation. Label illustrative data as illustrative. Never present invented measurements as real observations.
- Read [references/design.md](references/design.md) for layout, color, motion, and accessibility choices. Read [references/api.md](references/api.md) while implementing a scene.

## Create the files

Copy [assets/starter/](assets/starter/) to the requested output folder. The helper does this without replacing an existing folder:

```bash
node <skill-directory>/scripts/create.mjs <output-directory>
```

Edit `scene.js`: title, caption, alt text, duration, responsive height, and `draw(f, t)`. The starter HTML imports the player and mounts the scene. Keep the player and its controls shared rather than rebuilding them per scene.

**Draw from time alone.** A frame must be determined by `t`, scene dimensions, and fixed input data. Do not accumulate counters, keep frame-dependent flags, use unseeded randomness, or create timers in the scene. Seeking backward and forward must reproduce the same frame at the same time.

Use `f.w`, `f.h`, and `f.narrow` for layout. Give compact screens their own arrangement rather than scaling down labels. Use `f.tone(name, step)` and `f.c` for colors. Preserve participant identities between phases; explain state changes with tint, outlines, and text.

The player provides speed, pause, reverse, and a keyboard-accessible timeline. Scene times remain logical seconds at 1×. Motion is paused offscreen and when the tab is hidden; reduced-motion readers start with a still conclusion.

## Deliver

Serve the output over HTTP so browser modules load:

```bash
node <skill-directory>/scripts/serve.mjs <output-directory> --port 4310
```

Provide the output path and preview URL. When the user requests review, check representative frames, the final frame, light/dark themes, narrow layout, and seek reproducibility. If the user requests a GIF, record the rendered diagram; record real control interactions when demonstrating the player.
