import { describe, expect, it } from 'vitest';
import { applyTextTransform, covers, firstFamily, groupLines, parseRgb, pdfWeight, pxToPt, type CharBox } from '../pdfText.js';

/** Lay out a string as fixed-width boxes; `\n` starts a new visual line (like wrapping). */
function layout(text: string, x0 = 100, y0 = 50, w = 10, h = 20): CharBox[] {
  const boxes: CharBox[] = [];
  let x = x0;
  let y = y0;
  for (const ch of text) {
    if (ch === '\n') {
      x = x0;
      y += h * 1.4;
      continue;
    }
    boxes.push({ ch, left: x, top: y, width: w, height: h });
    x += w;
  }
  return boxes;
}

describe('groupLines', () => {
  it('keeps a single line intact with its geometry', () => {
    expect(groupLines(layout('The Night'))).toEqual([{ text: 'The Night', left: 100, top: 50, width: 90, height: 20 }]);
  });

  it('splits where the browser wrapped and trims spaces at the break', () => {
    const lines = groupLines(layout('The sky on the \nday you were born'));
    expect(lines.map((l) => l.text)).toEqual(['The sky on the', 'day you were born']);
    expect(lines[1].top).toBe(78);
    expect(lines[1].left).toBe(100);
  });

  it('collapses runs of whitespace and ignores whitespace-only lines', () => {
    expect(groupLines(layout('a   b\n   ')).map((l) => l.text)).toEqual(['a b']);
  });

  it('does not start a new line for a slightly offset glyph (diacritics, baseline jitter)', () => {
    const boxes = layout('Café');
    boxes[3] = { ...boxes[3], top: boxes[3].top + 3 };
    expect(groupLines(boxes).map((l) => l.text)).toEqual(['Café']);
  });

  it('keeps zero-width combining marks with their base letter', () => {
    const boxes = layout('Viê');
    boxes.push({ ch: '̣', left: 130, top: 50, width: 0, height: 20 });
    expect(groupLines(boxes)[0].text).toBe('Việ');
  });
});

describe('covers', () => {
  const latin: [number, number][] = [[0x20, 0x7e], [0xa0, 0x24f]];
  const latinCyr: [number, number][] = [...latin, [0x400, 0x52f]];
  it('accepts text whose code points are all in range', () => {
    expect(covers('Anna & Max, 29.06.2026', latin)).toBe(true);
    expect(covers('Ночь, когда мы встретились', latinCyr)).toBe(true);
  });
  it('rejects scripts the font lacks', () => {
    expect(covers('Ночь', latin)).toBe(false);
    expect(covers('星空', latinCyr)).toBe(false);
    expect(covers('ليلة', latinCyr)).toBe(false);
  });
  it('handles astral code points (emoji) as one character', () => {
    expect(covers('Love ❤', latin)).toBe(false);
    expect(covers('Love 😀', [[0x20, 0x7e], [0x1f600, 0x1f600]])).toBe(true);
  });
});

describe('style helpers', () => {
  it('maps CSS weights to the two PDF weights', () => {
    expect(pdfWeight('400')).toBe(400);
    expect(pdfWeight(300)).toBe(400);
    expect(pdfWeight('500')).toBe(500);
    expect(pdfWeight('bold')).toBe(500);
  });
  it('extracts the primary family', () => {
    expect(firstFamily('"Cormorant Garamond", serif')).toBe('Cormorant Garamond');
    expect(firstFamily("'Playfair Display', Georgia, serif")).toBe('Playfair Display');
    expect(firstFamily('Montserrat')).toBe('Montserrat');
  });
  it('applies text-transform like CSS', () => {
    expect(applyTextTransform('paris, france', 'uppercase')).toBe('PARIS, FRANCE');
    expect(applyTextTransform('istanbul', 'uppercase', 'tr')).toBe('İSTANBUL');
    expect(applyTextTransform('anna and max', 'capitalize')).toBe('Anna And Max');
    expect(applyTextTransform('Keep', 'none')).toBe('Keep');
  });
  it('parses computed colors', () => {
    expect(parseRgb('rgb(255, 255, 255)')).toEqual([255, 255, 255]);
    expect(parseRgb('rgba(26, 26, 26, 0.9)')).toEqual([26, 26, 26]);
    expect(parseRgb('rgb(10 20 30 / 50%)')).toEqual([10, 20, 30]);
    expect(parseRgb('transparent')).toBeNull();
  });
  it('converts screen px to print points', () => {
    // a 400px-wide preview of a 300mm poster: 30px text → 22.5mm → 63.78pt
    expect(pxToPt(30, 300 / 400)).toBeCloseTo(63.78, 2);
  });
});
