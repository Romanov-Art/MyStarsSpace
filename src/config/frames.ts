// ──────────────────────────────────────────────────────────────────
// Frame configuration system
// 
// Frame filenames encode metadata: Frame{N}-{side}-{innerDiameter}.svg
// - N: design variant number
// - side: square side in mm (used as 100% reference)
// - innerDiameter: inner circle diameter in mm where stars render
//
// Example: Frame1-300-215.svg
//   → frameSize = 300, innerDiameter = 215
//   → star circle ratio = 215/300 = 0.7167
//   → star radius = (215/300)/2 = 0.3583 of container width
// ──────────────────────────────────────────────────────────────────

export interface FrameConfig {
  id: string;
  label: string;
  filename: string;
  /** Square side dimension in mm (reference unit) */
  frameSize: number;
  /** Inner circle diameter in mm where stars render */
  innerDiameter: number;
  /** Computed: ratio of inner circle to frame = innerDiameter / frameSize */
  circleRatio: number;
  /** Computed: star rendering radius as fraction of container = innerDiameter / (2 * frameSize) */
  starRadiusFraction: number;
}

function parseFrameFilename(filename: string): { design: number; frameSize: number; innerDiameter: number } | null {
  // Match: Frame{N}-{side}-{innerDiameter}.svg
  const match = filename.match(/^Frame(\d+)-(\d+)-(\d+)\.svg$/);
  if (!match) return null;
  return {
    design: parseInt(match[1]),
    frameSize: parseInt(match[2]),
    innerDiameter: parseInt(match[3]),
  };
}

function createFrameConfig(filename: string, label: string): FrameConfig {
  const parsed = parseFrameFilename(filename);
  if (!parsed) {
    throw new Error(`Invalid frame filename: ${filename}`);
  }
  return {
    id: `frame${parsed.design}`,
    label,
    filename,
    frameSize: parsed.frameSize,
    innerDiameter: parsed.innerDiameter,
    circleRatio: parsed.innerDiameter / parsed.frameSize,
    starRadiusFraction: parsed.innerDiameter / (2 * parsed.frameSize),
  };
}

// ── Available frames ──
// Note: we override with exact SVG geometry for pixel-perfect alignment
export const FRAMES: FrameConfig[] = [
  {
    ...createFrameConfig('Frame2-300-215.svg', 'Modern'),
    // Exact values from SVG: viewBox 708.67×708.67, inner circle r=303.31
    circleRatio: (303.31 * 2) / 708.67,         // 0.8558
    starRadiusFraction: 303.31 / 708.67,         // 0.4279
  },
  {
    ...createFrameConfig('Frame1-300-215.svg', 'Classic'),
    // Exact values from SVG: viewBox 850.39×850.39, inner circle r=302.67
    circleRatio: (302.67 * 2) / 850.39,         // 0.7119
    starRadiusFraction: 302.67 / 850.39,         // 0.3559
  },
];

// Legacy fallback for old black-frame.svg (non-square, will be deprecated)
export const LEGACY_FRAME: FrameConfig = {
  id: 'legacy',
  label: 'Legacy',
  filename: 'black-frame.svg',
  frameSize: 850,
  innerDiameter: 543, // 2 * 271.73
  circleRatio: 543 / 850,
  starRadiusFraction: 543 / (2 * 850),
};

export function getDefaultFrame(): FrameConfig {
  // Use Frame1 if available, otherwise legacy
  return FRAMES[0] || LEGACY_FRAME;
}

export function getFrameById(id: string): FrameConfig {
  return FRAMES.find(f => f.id === id) || LEGACY_FRAME;
}
