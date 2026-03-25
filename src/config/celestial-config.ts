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
  { width: 21, height: 30, label: '21×30' },
  { width: 30, height: 40, label: '30×40' },
  { width: 40, height: 50, label: '40×50' },
  { width: 50, height: 70, label: '50×70' },
];
