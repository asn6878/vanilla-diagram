# Brand assets

The **Vanilla Infographics** mark combines a wooden **V** with a mallet shaped as **I**. The representative image uses the mark alone; the README banner places it above the wordmark.

| Asset | Format | Size |
| --- | --- | --- |
| [Logo](logo.svg) | Transparent SVG | 1200 × 1200 |
| [Logo PNG](logo.png) | Transparent PNG | 1200 × 1200 |
| [README banner](banner.svg) | SVG | 1600 × 640 |
| [Banner PNG](banner.png) | PNG | 1600 × 640 |

The SVGs are editable and scale without losing detail. Banner lettering uses Oswald Bold at weight 700, converted to outlines, so rendering needs no installed font or network request.

Run `npm run dev` and open `/docs/brand/` to view the assets. To rebuild the vectors, install `fonttools` and `uharfbuzz` in a Python environment and run `python scripts/build-brand.py`.

The included [Oswald source font](https://github.com/google/fonts/tree/main/ofl/oswald) is distributed under its [SIL Open Font License](fonts/OFL.txt). The artwork is covered by the repository's MIT license.
