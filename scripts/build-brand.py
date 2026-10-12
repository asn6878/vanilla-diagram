#!/usr/bin/env python3
"""Build the approved VI mark and Oswald Bold banner."""
from pathlib import Path
from io import BytesIO
from html import escape
import fontTools.ttLib
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
import uharfbuzz as hb

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / 'docs/brand'
FONT = BRAND / 'fonts/Oswald.ttf'
font = instantiateVariableFont(fontTools.ttLib.TTFont(FONT), {'wght': 700}, inplace=False)
font_bytes = BytesIO()
font.save(font_bytes)
face = hb.Face(font_bytes.getvalue())
hbfont = hb.Font(face)
hbfont.scale = (face.upem, face.upem)
glyphset = font.getGlyphSet()
glyphorder = font.getGlyphOrder()

INK = '#493427'
WOOD = '#E1AC70'
PALE = '#EFCB99'
GRAIN = '#A77243'


def wordmark(cx, baseline, size, ink):
    text = 'Vanilla Infographics'
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf)
    width = sum(p.x_advance for p in buf.glyph_positions)
    scale = size / face.upem
    x = 0
    paths = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        pen = SVGPathPen(glyphset, ntos=lambda n: f'{n:.2f}'.rstrip('0').rstrip('.') if n else '0')
        glyphset[glyphorder[info.codepoint]].draw(pen)
        commands = pen.getCommands()
        if commands:
            paths.append(f'<path transform="translate({x + pos.x_offset} {pos.y_offset})" d="{commands}"/>')
        x += pos.x_advance
    return f'<g aria-label="{text}" fill="{ink}" transform="translate({cx - width * scale / 2:.3f} {baseline}) scale({scale:.6f} {-scale:.6f})">'+''.join(paths)+'</g>'

def monogram():
    return f'''<g transform="translate(-24 0)" stroke="{INK}" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round">
      <path d="M-188-143L-124-159-45 113-58 171-105 156Z" fill="#E7BC83"/>
      <path d="M-58 171L-23 159 65-134 4-152-77 129Z" fill="#C98F55"/>
      <path d="M-188-143L-176-153-122-170-124-159Z" fill="#F2D4A9" stroke-width="3"/>
      <path d="M4-152L15-160 72-141 65-134Z" fill="#E1AD75" stroke-width="3"/>
      <path d="M-159-124C-147-60-121 11-111 57M23-120C13-77-3-34-8 3" stroke="#AA7443" stroke-width="2.3" fill="none"/>
      <circle cx="-141" cy="-118" r="5.5" fill="#6C7776" stroke="#3C494B" stroke-width="2.2"/>
      <circle cx="25" cy="-114" r="5.5" fill="#6C7776" stroke="#3C494B" stroke-width="2.2"/>
      <circle cx="-60" cy="132" r="5.5" fill="#6C7776" stroke="#3C494B" stroke-width="2.2"/>
      <path d="M123-87H171L179 153Q179 171 161 175H137Q119 170 119 153Z" fill="#EFCC99"/>
      <path d="M107-139L124-157H211L225-142 208-125 193-139Z" fill="#F0C997" stroke-width="3"/>
      <path d="M208-125L225-142V-71L208-54Z" fill="#B87942" stroke-width="3"/>
      <path d="M107-139H194L208-125V-54L194-40H107L93-54V-125Z" fill="#DEA76A"/>
      <path d="M108-125H193M138-13C136 34 143 68 138 124" fill="none" stroke="#BD844C" stroke-width="2.3"/>
    </g>'''

def svg(width, height, title, description, body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="brand-title brand-description">
  <title id="brand-title">{escape(title)}</title>
  <desc id="brand-description">{escape(description)}</desc>
  {body}
</svg>\n'''

logo = '<g id="tool-mark" transform="translate(600 600) scale(2.34375)">' + monogram() + '</g>'
(BRAND / 'logo.svg').write_text(svg(1200, 1200, 'Vanilla Infographics — VI mark', 'A wooden V and a wooden mallet shaped as I. Transparent background; editable vector paths.', logo))
banner = '<rect width="1600" height="640" fill="#FFFFFF"/>'
banner += '<g id="tool-mark" transform="translate(800 233) scale(.83)">' + monogram() + '</g>'
banner += wordmark(800, 559, 106, '#302A25')
(BRAND / 'banner.svg').write_text(svg(1600, 640, 'Vanilla Infographics', 'The wooden VI mark centered above an Oswald Bold wordmark. Lettering is outlined and needs no external font.', banner))
print('Wrote the approved VI-only logo and unchanged monogram banner.')
