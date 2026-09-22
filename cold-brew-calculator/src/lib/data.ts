// Reference data for the calculator.
// Altitude follows the SCA convention: metres above sea level (masl).

export type ProcessId =
  | 'washed'
  | 'honey'
  | 'natural'
  | 'wet-hulled'
  | 'fermented'
  | 'co-fermented';

export interface Origin {
  id: string;
  name: string;
  /** Typical farm altitude range, masl. Used as the placeholder hint. */
  altitude: [number, number];
  /** Most common process for this origin, used when the user picks it. */
  typicalProcess: ProcessId;
  notes: string;
}

export const ORIGINS: Origin[] = [
  {
    id: 'kintamani',
    name: 'Bali Kintamani',
    altitude: [1200, 1600],
    typicalProcess: 'washed',
    notes: 'Citrus, sweet orange, light body. Your tea-like baseline.',
  },
  {
    id: 'yirgacheffe',
    name: 'Ethiopia Yirgacheffe',
    altitude: [1800, 2200],
    typicalProcess: 'washed',
    notes: 'Floral, bergamot, lemon. Very tea-like when washed.',
  },
  {
    id: 'aji-bourbon',
    name: 'Colombia Ají Bourbon',
    altitude: [1700, 2000],
    typicalProcess: 'washed',
    notes: 'Red fruit, bright acidity, some spice. Dense high-grown bean.',
  },
  {
    id: 'custom',
    name: 'Other / custom',
    altitude: [1000, 2000],
    typicalProcess: 'washed',
    notes: 'Type the origin name below.',
  },
];

export interface Process {
  id: ProcessId;
  name: string;
  /** Added to the base ratio (more water = positive). */
  ratioAdj: number;
  why: string;
}

export const PROCESSES: Process[] = [
  { id: 'washed', name: 'Washed (full wash)', ratioAdj: 0, why: 'Clean and light. Baseline.' },
  { id: 'honey', name: 'Honey', ratioAdj: 0.5, why: 'Sweeter, rounder. A touch more water keeps it light.' },
  { id: 'natural', name: 'Natural', ratioAdj: 1, why: 'Very soluble fruit and sugar. More water stops it going heavy or boozy.' },
  { id: 'wet-hulled', name: 'Wet-hulled (giling basah)', ratioAdj: 0.5, why: 'Heavy body, earthy. Extra water keeps the body down.' },
  { id: 'fermented', name: 'Fermented (anaerobic)', ratioAdj: 1, why: 'Intense and winey. More water to stay tea-like.' },
  { id: 'co-fermented', name: 'Co-fermented', ratioAdj: 1.5, why: 'Strongest added fruit. Dilute most.' },
];

/** Your validated starting point: 40 g Kintamani washed at 1:14, no bloom. */
export const BASE_RATIO = 14;

export interface AltitudeBand {
  max: number;
  label: string;
  ratioAdj: number;
  why: string;
}

export const ALTITUDE_BANDS: AltitudeBand[] = [
  { max: 1199, label: 'Low (<1,200 masl)', ratioAdj: 0.5, why: 'Softer bean, extracts fast. A bit more water.' },
  { max: 1799, label: 'Mid (1,200–1,799 masl)', ratioAdj: 0, why: 'Baseline density.' },
  { max: Infinity, label: 'High (≥1,800 masl)', ratioAdj: -0.5, why: 'Denser bean, extracts slower in cold water. A bit more coffee.' },
];

export interface WaterType {
  id: string;
  name: string;
  /** Typical TDS in mg/L (ppm). null = user supplied. */
  tds: number | null;
}

export const WATERS: WaterType[] = [
  { id: 'ro', name: 'RO (reverse osmosis)', tds: 10 },
  { id: 'distilled', name: 'Distilled', tds: 1 },
  { id: 'custom', name: 'Custom', tds: null },
];

/** SCA water quality standard (brewing water). */
export const SCA_WATER = {
  tdsTarget: 150,
  tdsMin: 75,
  tdsMax: 250,
};

export const ELEMENT_SOURCES = [
  'Pineapple',
  'Orange',
  'Lime',
  'Lemon',
  'Passion fruit',
  'Mango',
  'Strawberry',
  'Other',
] as const;

/** Starting ratios for elements added after filtering (cold brew : element). */
export const AFTER_FILTER_PRESETS = {
  juice: [
    { ratio: 12, label: '1:12 · aftertaste only' },
    { ratio: 8, label: '1:8 · balanced' },
    { ratio: 6, label: '1:6 · fruit up front' },
  ],
  syrup: [
    { ratio: 20, label: '1:20 · hint' },
    { ratio: 15, label: '1:15 · balanced' },
    { ratio: 10, label: '1:10 · sweet' },
  ],
} as const;
