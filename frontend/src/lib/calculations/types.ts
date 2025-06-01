import type { Treatment } from '$lib/stores/client-state.svelte.ts';

// Extended treatment type for IOB calculations
export interface ExtendedTreatment extends Treatment {
  absolute?: number;
  duration?: number;
}

// IOB calculation result interface
export interface IOBResult {
  iob?: number;
  activity?: number;
  lastBolus?: Treatment | null;
  source?: string;
  device?: string;
  mills?: number;
  basaliob?: number;
  treatmentIob?: number;
  display?: string;
  displayLine?: string;
}

// IOB contribution from a single treatment
export interface IOBContribution {
  iobContrib: number;
  activityContrib: number;
}

// Profile interface for IOB calculations
export interface IOBProfile {
  getDIA?: (time: number, spec_profile?: unknown) => number;
  getSensitivity?: (time: number, spec_profile?: unknown) => number;
}

// Modular IOB interfaces for device status
export interface LoopIOBData {
  iob: number;
  timestamp: string;
}

export interface OpenAPSIOBData {
  iob: number;
  basaliob?: number;
  activity?: number;
  timestamp?: string;
  time?: string;
}

export interface PumpIOBData {
  timestamp: string;
  bolusiob: number;
  basaliob: number;
  iob?: number;
}

export interface HourlyStats {
  hour: number;
  readingsCount: number;
  average: number;
  min: number;
  p10: number;
  quartile25: number;
  median: number;
  quartile75: number;
  p90: number;
  max: number;
  standardDeviation: number;
  basalIob: number;
  tempIob: number;
  glucoseValues: number[];
}

export interface HourlyBoxPlotData {
  hour: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
}
