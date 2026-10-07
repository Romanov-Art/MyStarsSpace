import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { posterSizes } from '../celestial-config.js';

// App.tsx builds the size-picker hover image as `/tooltip/${label with × → x}.jpg`;
// a size without a matching file renders a broken image in production.
describe('poster size tooltips', () => {
  it.each(posterSizes.map((s) => s.label))('size %s has a tooltip image', (label) => {
    const file = resolve(__dirname, '../../../public/tooltip', `${label.replace('×', 'x')}.jpg`);
    expect(existsSync(file), `missing public/tooltip/${label.replace('×', 'x')}.jpg`).toBe(true);
  });
});
