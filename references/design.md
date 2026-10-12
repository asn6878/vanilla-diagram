# Design choices

## Composition

Use movement for order, handoffs, or change. Keep static relationships still unless movement clarifies them. Prefer one main idea per scene; split crowded explanations when that makes them easier to follow. Three to five phases and a few participants are useful starting points, not quotas.

Arrange cause and effect left to right or top to bottom. Reserve space for labels and connectors before drawing. Put direct labels close to their subjects. On narrow screens, stack panels or change the diagram's arrangement. Keep label text at least 11px; shorten wording instead of shrinking everything.

The card has a title, controls, stage, phase note, and timeline. The caption follows the card. The scene draws only the stage and sets its note.

## Color system

The shared stylesheet supplies ten identity colors in both themes. Each has three steps:

| Step | Purpose | API |
| --- | --- | --- |
| Base | Lines, dots, and visible outlines | `f.tone('blue')` |
| Tint 1 | The participant or area currently being acted on | `f.tone('blue', 1)` |
| Tint 2 | A persistent background wash behind labels | `f.tone('blue', 2)` |

| Name | Light base | Dark base |
| --- | --- | --- |
| blue | `#2f6ff0` | `#3987e5` |
| cyan | `#008fa8` | `#27abc0` |
| indigo | `#6264d9` | `#8589f0` |
| violet | `#9057d5` | `#ad7ee8` |
| pink | `#ca4f91` | `#df78b1` |
| red | `#e3503e` | `#e85f4c` |
| orange | `#c76a18` | `#df873e` |
| amber | `#a88400` | `#b59425` |
| green | `#12a37f` | `#12a37f` |
| slate | `#64748b` | `#8b98ab` |

Choose only the colors needed by the explanation, often two to four. Roles are not permanently tied to hues. Keep one color's meaning consistent within a diagram and recurring participants consistent across related scenes. If red, green, or amber encode outcomes, keep that meaning distinct from identity colors.

Use labels as well as color. This palette is not fully distinguishable for every type of color vision; use shapes or line styles when similar colors meet. A wash needs its own base outline or a label. Ordinary text uses `f.c.text` or `f.c.strong` on tinted fills. Use `f.c.muted` on neutral backgrounds. Syntax highlighting in `f.code()` marks syntax rather than participant identity.

Neutrals: `bg`, `soft`, `grid`, `line`, `text`, `strong`, `muted`. Structure can stay neutral. Scenes request tokens rather than hardcoding hex values, so theme changes are shared. Exact tints and code colors live in `assets/starter/diagram.css`.

## Motion and timing

Motion should encode something specific: a transfer, a reveal, a changed value. Use `f.inout` for travel and `f.ease` for arrival; linear progress suits an axis. Avoid decorative bounce or idle motion.

For a short explainer, start with an 8–14 second loop. Give transitions time to settle and hold the final state for about two seconds. Simultaneous movement is useful when simultaneity is the point. The conclusion stays visible, including for reduced-motion readers.

Counts, charts, and visible states derive from `t`. For example, a completed-event count is the number of scheduled event times less than or equal to `t`, not a counter incremented during drawing. Precompute fixed arrays outside `draw`; do not mutate them while rendering.

## Copy and accessibility

Use the user's language. Write short, factual labels, a caption describing the idea, and phase notes describing the current relationship or action. Match the tone to the audience. Avoid rhetorical teasers and personification that make the system's behavior less precise.

Alt text describes the content and outcome. Each paused phase should explain itself. Retain native buttons and the range input, visible focus, and reduced-motion support. Controls must remain usable at phone width.
