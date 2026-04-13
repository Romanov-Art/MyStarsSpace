/**
 * Color themes for the star map.
 */

import type { Theme } from '../types/index.js';

export const themes: Record<string, Theme> = {
  black: {
    id: 'black',
    name: 'Classic Black',
    background: '#000000',
    stars: '#ffffff',
    grid: '#6c757d',
    constellationLines: '#f8f9fa',
    text: '#ffffff',
    borderColor: '#000000',
    borderWidth: 0,
  },
  white: {
    id: 'white',
    name: 'Elegant White',
    background: '#ffffff',
    stars: '#000000',
    grid: '#cccccc',
    constellationLines: '#333333',
    text: '#000000',
    borderColor: '#bbb',
    borderWidth: 1.5,
  },
  navy: {
    id: 'navy',
    name: 'Deep Navy',
    background: '#363a44',
    stars: '#ffffff',
    grid: '#4a5068',
    constellationLines: '#8a9ab5',
    text: '#ffffff',
    borderColor: '#363a44',
    borderWidth: 0,
  },
  beige: {
    id: 'beige',
    name: 'Warm Beige',
    background: '#fff2e0',
    stars: '#1a1a1a',
    grid: '#fff2e0',
    constellationLines: '#fff2e0',
    text: '#2c2418',
    borderColor: '#c4b49c',
    borderWidth: 1.5,
  },
};

/**
 * Get a theme by ID. Defaults to 'black'.
 */
export function getTheme(id: string): Theme {
  return themes[id] ?? themes.black;
}

/**
 * Get all available theme IDs.
 */
export function getAvailableThemes(): string[] {
  return Object.keys(themes);
}
