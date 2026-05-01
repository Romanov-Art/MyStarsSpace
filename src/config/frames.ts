// ──────────────────────────────────────────────────────────────────
// Frame configuration system
//
// Each compass style maps to a specific SVG frame file.
// All frames share the same geometry:
//   viewBox: 708.67 × 708.67
//   inner circle: r = 303.31 (center 354.34, 354.33)
// ──────────────────────────────────────────────────────────────────

export interface FrameConfig {
  filename: string;
  /** viewBox dimension (square) */
  viewBoxSize: number;
  /** Inner circle radius in SVG units */
  innerRadius: number;
  /** Computed: star rendering radius as fraction of container */
  starRadiusFraction: number;
}

/** Shared geometry for all current frame SVGs */
const SHARED_GEOMETRY = {
  viewBoxSize: 708.67,
  innerRadius: 303.31,
} as const;

const starRadiusFraction = SHARED_GEOMETRY.innerRadius / SHARED_GEOMETRY.viewBoxSize; // ≈ 0.4279

export type CompassStyle = 'none' | 'simple' | 'degrees' | 'cardinal';

/** Map compass style → frame SVG filename */
const COMPASS_FRAME_MAP: Record<CompassStyle, string> = {
  none: 'frame-none.svg',
  simple: 'frame-simple.svg',
  degrees: 'frame-degrees.svg',
  cardinal: 'frame-degrees.svg', // reuses degrees frame
};

/** Get frame config for a given compass style */
export function getFrameForCompass(compassStyle: CompassStyle): FrameConfig {
  return {
    filename: COMPASS_FRAME_MAP[compassStyle],
    viewBoxSize: SHARED_GEOMETRY.viewBoxSize,
    innerRadius: SHARED_GEOMETRY.innerRadius,
    starRadiusFraction,
  };
}

/** Default frame (backwards compat) */
export function getDefaultFrame(): FrameConfig {
  return getFrameForCompass('none');
}
