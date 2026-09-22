import { ALTITUDE_BANDS, BASE_RATIO, PROCESSES, type ProcessId } from './data';

export type ElementKind = 'juice' | 'syrup';
export type ElementTiming = 'after' | 'during';

export interface BrewElement {
  id: string;
  kind: ElementKind;
  source: string;
  sourceCustom: string;
  timing: ElementTiming;
  /** After filter: cold brew : element, e.g. 8 means 1:8. */
  ratio: number;
  /** During steep: unit of the amount. 'g' means whole fruit, not juice. */
  duringUnit: 'ml' | 'g';
  duringAmount: number;
}

export interface Recipe {
  id: string | null;
  name: string;
  updatedAt: number;
  originId: string;
  originCustom: string;
  processId: ProcessId | '';
  altitude: number | null;
  ratio: number;
  /** When true the ratio follows the suggestion for the chosen bean. */
  ratioAuto: boolean;
  coffeeG: number;
  waterMl: number;
  anchor: 'coffee' | 'water';
  bloom: boolean;
  waterTypeId: string;
  waterCustomName: string;
  waterCustomTds: number | null;
  serveMl: number;
  elements: BrewElement[];
}

export const newId = () => Math.random().toString(36).slice(2, 10);

export function defaultRecipe(): Recipe {
  return {
    id: null,
    name: '',
    updatedAt: 0,
    originId: 'kintamani',
    originCustom: '',
    processId: 'natural',
    altitude: 1300,
    ratio: 15,
    ratioAuto: true,
    coffeeG: 60,
    waterMl: 900,
    anchor: 'coffee',
    bloom: false,
    waterTypeId: 'ro',
    waterCustomName: '',
    waterCustomTds: null,
    serveMl: 200,
    elements: [],
  };
}

export function newElement(): BrewElement {
  return {
    id: newId(),
    kind: 'juice',
    source: 'Pineapple',
    sourceCustom: '',
    timing: 'after',
    ratio: 8,
    duringUnit: 'ml',
    duringAmount: 50,
  };
}

export interface RatioPart {
  label: string;
  adj: number;
  why: string;
}

export function suggestRatio(processId: ProcessId | '', altitude: number | null) {
  const parts: RatioPart[] = [
    { label: 'Base (your Kintamani washed test)', adj: BASE_RATIO, why: 'Validated tea-like result, no bloom.' },
  ];
  const p = PROCESSES.find((x) => x.id === processId);
  if (p && p.ratioAdj !== 0) parts.push({ label: p.name, adj: p.ratioAdj, why: p.why });
  if (altitude && altitude > 0) {
    const band = ALTITUDE_BANDS.find((b) => altitude <= b.max)!;
    if (band.ratioAdj !== 0) parts.push({ label: band.label, adj: band.ratioAdj, why: band.why });
  }
  const ratio = parts.reduce((s, x) => s + x.adj, 0);
  return { ratio, parts };
}

export const ABSORB_ML_PER_G = 2;
export const BLOOM_ML_PER_G = 1.5;

export function syncBrew(r: Recipe): Recipe {
  if (r.ratio > 0) {
    if (r.anchor === 'coffee') r.waterMl = Math.round(r.coffeeG * r.ratio);
    else r.coffeeG = round(r.waterMl / r.ratio, 1);
  }
  return r;
}

export function computeBrew(r: Recipe) {
  const bloomMl = r.bloom ? r.coffeeG * BLOOM_ML_PER_G : 0;
  const restMl = Math.max(0, r.waterMl - bloomMl);
  const absorbedMl = r.coffeeG * ABSORB_ML_PER_G;
  const duringLiquidMl = r.elements
    .filter((e) => e.timing === 'during' && e.duringUnit === 'ml')
    .reduce((s, e) => s + (e.duringAmount || 0), 0);
  const duringFruitG = r.elements
    .filter((e) => e.timing === 'during' && e.duringUnit === 'g')
    .reduce((s, e) => s + (e.duringAmount || 0), 0);
  const yieldMl = Math.max(0, r.waterMl + duringLiquidMl - absorbedMl);
  const effectiveRatio = r.coffeeG > 0 ? (r.waterMl + duringLiquidMl) / r.coffeeG : 0;
  return { bloomMl, restMl, absorbedMl, duringLiquidMl, duringFruitG, yieldMl, effectiveRatio };
}

export function computeElement(e: BrewElement, r: Recipe, yieldMl: number) {
  if (e.timing === 'after') {
    const perServe = e.ratio > 0 ? r.serveMl / e.ratio : 0;
    const perBatch = e.ratio > 0 ? yieldMl / e.ratio : 0;
    return { perServe, perBatch, perLitre: 0 };
  }
  const perLitre = r.waterMl > 0 ? (e.duringAmount / r.waterMl) * 1000 : 0;
  return { perServe: 0, perBatch: e.duringAmount, perLitre };
}

export const elementLabel = (e: BrewElement) =>
  `${e.source === 'Other' ? e.sourceCustom || 'Custom' : e.source} ${e.kind}`;

export function round(v: number, d = 0) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
