/**
 * Default star map configuration.
 */

import type { StarMapConfig, PosterSize } from '../types/index.js';
import { getTheme } from './themes.js';

/**
 * Default configuration matching d3-celestial settings from atlas-stars.ru.
 */
export function getDefaultConfig(themeId = 'black'): StarMapConfig {
  return {
    projectionRadius: 200,
    magnitudeLimit: 6.0,
    minAltitude: 0,
    starSize: {
      base: 3,
      exponent: -0.2,
    },
    layers: {
      stars: true,
      constellationLines: true,
      constellationNames: false,
      grid: true,
      cardinalDirections: true,
      milkyWay: false,
    },
    theme: getTheme(themeId),
  };
}

/**
 * Available poster sizes in centimeters.
 */
export const posterSizes: PosterSize[] = [
  { width: 10, height: 15, label: '10×15' },
  { width: 21, height: 29.7, label: 'A4' },
  { width: 30, height: 40, label: '30×40' },
  { width: 40, height: 50, label: '40×50' },
  { width: 45, height: 60, label: '45×60' },
  { width: 60, height: 90, label: '60×90' },
];
