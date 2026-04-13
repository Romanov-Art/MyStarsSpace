// ─── Astronomical Coordinates ─────────────────────────────────────

/** Equatorial coordinates (J2000.0) */
export interface EquatorialCoords {
  /** Right Ascension in hours (0–24) */
  ra: number;
  /** Declination in degrees (-90 to +90) */
  dec: number;
}

/** Horizontal (alt-azimuth) coordinates */
export interface HorizontalCoords {
  /** Altitude in degrees (-90 to +90), 0 = horizon, 90 = zenith */
  altitude: number;
  /** Azimuth in degrees (0–360), 0 = North, 90 = East */
  azimuth: number;
}

/** 2D point on the projected canvas */
export interface ProjectedPoint {
  x: number;
  y: number;
}

// ─── Geographic ───────────────────────────────────────────────────

/** Observer's geographic location */
export interface GeoLocation {
  /** Latitude in degrees (-90 to +90, positive = North) */
  lat: number;
  /** Longitude in degrees (-180 to +180, positive = East) */
  lon: number;
  /** IANA timezone string, e.g. "Europe/Moscow" */
  timezone: string;
}

// ─── Star Data ────────────────────────────────────────────────────

/** Star from the catalog */
export interface StarData {
  /** Unique identifier (e.g. HIP number) */
  id: string;
  /** Right Ascension in hours */
  ra: number;
  /** Declination in degrees */
  dec: number;
  /** Apparent magnitude (smaller = brighter) */
  magnitude: number;
  /** Proper name (e.g. "Sirius"), may be empty */
  name?: string;
  /** Bayer/Flamsteed designation (e.g. "α CMa") */
  designation?: string;
  /** IAU constellation abbreviation (e.g. "CMa") */
  constellation?: string;
  /** BV color index for star coloring */
  bv?: number;
}

/** Star with computed horizontal coords and projection */
export interface VisibleStar extends StarData {
  /** Computed horizontal coordinates */
  horizontal: HorizontalCoords;
  /** Projected 2D position on canvas */
  projected: ProjectedPoint;
  /** Rendered radius in pixels */
  renderSize: number;
}

// ─── Constellations ───────────────────────────────────────────────

/** A single segment of a constellation line */
export interface ConstellationSegment {
  /** Start point [RA in degrees, Dec in degrees] */
  start: [number, number];
  /** End point [RA in degrees, Dec in degrees] */
  end: [number, number];
}

/** Constellation line data */
export interface ConstellationLine {
  /** IAU abbreviation (e.g. "Ori") */
  id: string;
  /** Full name (e.g. "Orion") */
  name: string;
  /** Line segments connecting stars */
  segments: ConstellationSegment[];
}

// ─── Sky Snapshot ─────────────────────────────────────────────────

/** Complete sky state for a given moment and location */
export interface SkySnapshot {
  /** Observer location */
  location: GeoLocation;
  /** Observation date/time (UTC) */
  dateTime: Date;
  /** Julian Date */
  julianDate: number;
  /** Local Sidereal Time in hours */
  lst: number;
  /** Stars visible above the horizon */
  visibleStars: VisibleStar[];
  /** Constellation lines with projected positions */
  constellationLines: ProjectedConstellationLine[];
}

/** Constellation line projected to canvas */
export interface ProjectedConstellationLine {
  id: string;
  name: string;
  segments: Array<{
    start: ProjectedPoint;
    end: ProjectedPoint;
    /** Whether both endpoints are above the horizon */
    visible: boolean;
  }>;
}

// ─── Configuration ────────────────────────────────────────────────

/** Color theme for the star map */
export interface Theme {
  id: string;
  name: string;
  background: string;
  stars: string;
  grid: string;
  constellationLines: string;
  text: string;
  borderColor: string;
  /** Border width as percentage of poster width */
  borderWidth: number;
}

/** Star map rendering configuration */
export interface StarMapConfig {
  /** Projection radius in pixels */
  projectionRadius: number;
  /** Maximum magnitude to display (higher = more stars) */
  magnitudeLimit: number;
  /** Minimum altitude to consider "visible" (degrees above horizon) */
  minAltitude: number;
  /** Star size settings */
  starSize: {
    base: number;
    exponent: number;
  };
  /** Layer visibility */
  layers: {
    stars: boolean;
    constellationLines: boolean;
    constellationNames: boolean;
    grid: boolean;
    cardinalDirections: boolean;
    milkyWay: boolean;
  };
  /** Active theme */
  theme: Theme;
}

// ─── City ─────────────────────────────────────────────────────────

/** City entry for location selection */
export interface City {
  /** City name (in English) */
  name: string;
  /** Country name (in English) */
  country: string;
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** IANA timezone */
  timezone: string;
  /** Localized names: { "ru": "Москва", "en": "Moscow", ... } */
  localizedNames?: Record<string, string>;
}

// ─── Poster ───────────────────────────────────────────────────────

/** Poster size in centimeters */
export interface PosterSize {
  width: number;
  height: number;
  label: string;
}

/** Poster text configuration */
export interface PosterText {
  /** Main phrase */
  title: string;
  /** Subtitle (e.g. date and location) */
  subtitle: string;
  /** Additional tagline */
  tagline?: string;
}
