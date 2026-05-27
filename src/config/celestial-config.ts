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
 * Sizes correspond to standard international print ratios:
 * - Postcard: 10×15 cm / 4×6"
 * - A4:       21×29.7 cm / 8×11.7" (5:7 ratio)
 * - 30×40:    30×40 cm / 12×16"   (3:4 ratio)
 * - 40×50:    40×50 cm / 16×20"   (4:5 ratio)
 * - 40×60:    40×60 cm / 16×24"   (2:3 ratio)
 * - 50×70:    50×70 cm / 20×28"   (5:7 ratio)
 */
export const posterSizes: PosterSize[] = [
  { width: 10,   height: 15,   label: '10×15'  },  // Postcard  | 4×6"
  { width: 21,   height: 29.7, label: 'A4'     },  // A4        | 8×11.7"
  { width: 30,   height: 40,   label: '30×40'  },  // Standard  | 12×16"  (3:4)
  { width: 40,   height: 50,   label: '40×50'  },  // Medium    | 16×20"  (4:5)
  { width: 40,   height: 60,   label: '40×60'  },  // Large     | 16×24"  (2:3)
  { width: 50,   height: 70,   label: '50×70'  },  // Max       | 20×28"  (5:7)
];
