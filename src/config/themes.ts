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
  },
  white: {
    id: 'white',
    name: 'Elegant White',
    background: '#ffffff',
    stars: '#000000',
    grid: '#cccccc',
    constellationLines: '#333333',
    text: '#000000',
  },
  navy: {
    id: 'navy',
    name: 'Deep Navy',
    background: '#2A2F41',
    stars: '#ffffff',
    grid: '#4a5068',
    constellationLines: '#8a9ab5',
    text: '#ffffff',
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
