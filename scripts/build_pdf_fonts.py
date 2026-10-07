# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools==4.60.1", "brotli==1.1.0"]
# ///
"""
Build the TTF fonts embedded into the "Edit in Canva" PDF.

jsPDF can only embed TrueType, and can't pick an axis of a variable font, so
for every poster font (src/config/fonts.json) this takes the self-hosted
woff2 from public/fonts/fonts.css and writes a static, subset TTF for each
weight the poster text uses (400: phrase/subtitles, 500: main subtitle line).

Output: public/fonts/pdf/<slug>-<weight>.ttf and manifest.json with the
Unicode coverage of each file, which the browser uses to decide whether a
text line can stay editable (otherwise it is baked into the image).

Run: uv run scripts/build_pdf_fonts.py   (outputs are committed)
"""
import json
import re
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
FONTS_DIR = ROOT / "public" / "fonts"
OUT_DIR = FONTS_DIR / "pdf"
WEIGHTS = [400, 500]

# Latin (+ext), Greek, Cyrillic, Vietnamese, punctuation, currency, letterlike,
# arrows, shapes, misc symbols/dingbats (★ ♥ ✦ …) — whatever each font has
UNICODES = (
    "U+0020-024F,U+0300-036F,U+0370-03FF,U+0400-052F,U+1E00-1EFF,"
    "U+2000-206F,U+20A0-20CF,U+2100-214F,U+2190-21FF,U+25A0-25FF,U+2600-27BF"
)


def parse_css(css: str) -> dict[tuple[str, int], str]:
    """(family, weight) → woff2 file for normal-style faces."""
    faces = {}
    for block in re.findall(r"@font-face\s*{([^}]*)}", css):
        family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        style = re.search(r"font-style:\s*(\w+)", block)
        if style and style.group(1) != "normal":
            continue
        weight = int(re.search(r"font-weight:\s*(\d+)", block).group(1))
        src = re.search(r"url\(([^)]+)\)", block).group(1)
        faces[(family, weight)] = src
    return faces


def pick_face(faces: dict, family: str, weight: int) -> tuple[str, int]:
    """CSS font matching for weights 400/500: exact, then lighter, then heavier."""
    available = sorted(w for (f, w) in faces if f == family)
    if weight in available:
        return faces[(family, weight)], weight
    lighter = [w for w in available if w < weight]
    if 400 <= weight <= 500 and 400 in available:
        return faces[(family, 400)], 400
    if lighter:
        return faces[(family, lighter[-1])], lighter[-1]
    heavier = [w for w in available if w > weight]
    return faces[(family, heavier[0])], heavier[0]


def coverage_ranges(font: TTFont) -> list[list[int]]:
    codes = sorted(font.getBestCmap().keys())
    ranges: list[list[int]] = []
    for c in codes:
        if ranges and c == ranges[-1][1] + 1:
            ranges[-1][1] = c
        else:
            ranges.append([c, c])
    return ranges


def set_names(font: TTFont, family: str, weight: int) -> str:
    """
    Canva maps imported PDF fonts by name. Variable fonts carry the default
    instance's names ("Montserrat Thin", "Cormorant Garamond Light"), so give
    each static instance its real family/style names and weight class.
    """
    style = "Medium" if weight == 500 else "Regular"
    ps = f"{family.replace(' ', '')}-{style}"
    names = {1: family, 2: style, 4: f"{family} {style}", 6: ps, 16: family, 17: style}
    table = font["name"]
    table.names = [n for n in table.names if n.nameID not in names and n.nameID not in (21, 22, 25)]
    for name_id, value in names.items():
        table.setName(value, name_id, 3, 1, 0x409)
        table.setName(value, name_id, 1, 0, 0)
    font["OS/2"].usWeightClass = weight
    if "STAT" in font:
        del font["STAT"]
    return ps


def build(family: str, weight: int, faces: dict) -> tuple[str, str, list[list[int]]]:
    src, face_weight = pick_face(faces, family, weight)
    font = TTFont(FONTS_DIR / src)
    actual = face_weight  # static file: its own weight, whatever was requested
    if "fvar" in font:
        axis = next(a for a in font["fvar"].axes if a.axisTag == "wght")
        target = min(max(weight, axis.minValue), axis.maxValue)
        actual = int(target)
        font = instancer.instantiateVariableFont(font, {"wght": target}, updateFontNames=False)
    font.flavor = None  # woff2 → plain TrueType
    ps = set_names(font, family, actual)

    opts = subset.Options()
    opts.layout_features = ["kern", "liga", "clig", "calt"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.glyph_names = False
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)

    slug = re.sub(r"[^a-z0-9]+", "-", family.lower()).strip("-")
    name = f"{slug}-{weight}.ttf"
    font.save(OUT_DIR / name)
    return name, ps, coverage_ranges(font)


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    faces = parse_css((FONTS_DIR / "fonts.css").read_text())
    families = [f["name"] for f in json.loads((ROOT / "src/config/fonts.json").read_text())["fonts"]]
    manifest: dict = {"weights": WEIGHTS, "families": {}}
    for family in families:
        manifest["families"][family] = {}
        for weight in WEIGHTS:
            name, ps, ranges = build(family, weight, faces)
            # ps: the PostScript name written into the PDF — Canva matches fonts by it
            manifest["families"][family][str(weight)] = {"file": name, "ps": ps, "ranges": ranges}
            size = (OUT_DIR / name).stat().st_size // 1024
            print(f"{family:<20} {weight}  {name:<32} {size:>4} KB  {len(ranges)} ranges")
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")))


if __name__ == "__main__":
    main()
