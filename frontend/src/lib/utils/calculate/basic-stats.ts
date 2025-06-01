import type { Entry } from '../../../app.d.ts';

/**
 * Basic glucose statistics calculations
 */
export interface BasicGlucoseStats {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p75: number;
    p90: number;
    p95: number;
  };
}

export function calculateMean (glucoseValues: number[]): number {
  if (glucoseValues.length === 0) return 0;
  const sum = glucoseValues.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / glucoseValues.length) * 10) / 10; // Round to one decimal place
}

/**
 * Calculate basic glucose statistics
 */
export function calculateBasicStats(glucoseValues: number[]): BasicGlucoseStats {
  if (glucoseValues.length === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      standardDeviation: 0,
      percentiles: { p5: 0, p10: 0, p25: 0, p75: 0, p90: 0, p95: 0 }
    };
  }

  const sorted = [...glucoseValues].sort((a, b) => a - b);
  const count = glucoseValues.length;
  const mean = calculateMean(glucoseValues);
  const median = sorted[Math.floor(count / 2)];
  const min = sorted[0];
  const max = sorted[count - 1];

  // Standard deviation
  const variance = glucoseValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
  const standardDeviation = Math.sqrt(variance);

  // Percentiles
  const percentiles = {
    p5: calculatePercentile(sorted, 5),
    p10: calculatePercentile(sorted, 10),
    p25: calculatePercentile(sorted, 25),
    p75: calculatePercentile(sorted, 75),
    p90: calculatePercentile(sorted, 90),
    p95: calculatePercentile(sorted, 95)
  };

  return {
    count,
    mean: Math.round(mean * 10) / 10,
    median,
    min,
    max,
    standardDeviation: Math.round(standardDeviation * 10) / 10,
    percentiles
  };
}

/**
 * Calculate specific percentile from sorted array
 */
export function calculatePercentile(sortedGlucoseValues: number[], percentile: number): number {
  const index = (percentile / 100) * (sortedGlucoseValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedGlucoseValues[lower];
  }

  const weight = index - lower;
  return sortedGlucoseValues[lower] * (1 - weight) + sortedGlucoseValues[upper] * weight;
}

/**
 * Extract glucose values from entries, handling different data formats
 */
export function extractGlucoseValues(entries: Entry[]): number[] {
  return entries
    .map(entry => entry.sgv || entry.mgdl || 0)
    .filter(value => value > 0 && value < 600); // Filter out invalid readings
}
