# Vanilla Diagram

This repository contains an agent skill and a browser-native Canvas player. Keep the player dependency-free and the skill provider-neutral. Primary source and documentation are English; the Korean README lives in `docs/README.ko.md`.

The public brand is Vanilla Infographics; the repository and skill name are `vanilla-diagram`. Final brand assets live in `docs/brand/`. Unselected studies are local-only artifacts.

The shared runtime is in `assets/starter/`. Examples import it directly; avoid creating divergent copies. Drawing is a pure function of time and fixed input. Preserve native controls, reduced-motion behavior, and the ability to seek backward.

`npm run dev` serves examples at `http://localhost:4310/examples/`. `npm run capture` regenerates README GIFs using Playwright and FFmpeg. Media artifacts live in `docs/media/`. `npm test` checks meaningful timeline and installer behavior.
