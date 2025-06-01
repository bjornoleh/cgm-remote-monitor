import type { Entry } from '$lib';
import { calculateMean } from './basic-stats.ts';

/**
 * Glucose distribution data point interface
 */
export interface DistributionDataPoint {
  range: string;
  count: number;
  percent: number;
}

/**
 * Distribution bins configuration interface
 */
export interface DistributionBin {
  range: string;
  min: number;
  max: number;
}

/**
 * Default distribution bins (mg/dL)
 */
export const DEFAULT_DISTRIBUTION_BINS: DistributionBin[] = [
  { range: '<40', min: 0, max: 39 },
  { range: '40-50', min: 40, max: 50 },
  { range: '50-60', min: 51, max: 60 },
  { range: '60-70', min: 61, max: 70 },
  { range: '70-80', min: 71, max: 80 },
  { range: '80-90', min: 81, max: 90 },
  { range: '90-100', min: 91, max: 100 },
  { range: '100-110', min: 101, max: 110 },
  { range: '110-120', min: 111, max: 120 },
  { range: '120-130', min: 121, max: 130 },
  { range: '130-140', min: 131, max: 140 },
  { range: '140-150', min: 141, max: 150 },
  { range: '150-180', min: 151, max: 180 },
  { range: '180-250', min: 181, max: 250 },
  { range: '250-300', min: 251, max: 300 },
  { range: '>300', min: 301, max: 9999 }
];

export function calculateEstimatedHbA1C(values: number[]): string {
  const mean = calculateMean(values);
  if (mean === 0) return "0.0";
  const a1c = (mean + 46.7) / 28.7;
  return a1c.toFixed(1);
}

/**
 * Internal helper function to calculate distribution from glucose values
 */
function calculateDistributionFromValues(
  glucoseValues: number[],
  bins: DistributionBin[]
): DistributionDataPoint[] {
  if (glucoseValues.length === 0) {
    return [];
  }

  // Filter out invalid readings
  const readings = glucoseValues.filter(value => value > 0 && value < 1000);

  if (readings.length === 0) {
    return [];
  }

  // Count readings in each bin
  const counts = bins.map(bin => ({
    range: bin.range,
    count: readings.filter(reading => reading >= bin.min && reading <= bin.max).length,
    percent: 0
  }));

  // Calculate percentages
  const total = readings.length;
  counts.forEach(bin => {
    bin.percent = total > 0 ? Math.round((bin.count / total) * 100 * 10) / 10 : 0;
  });

  // Filter out empty bins
  return counts.filter(bin => bin.count > 0);
}

/**
 * Calculate glucose distribution from readings using configurable bins
 */
export function calculateGlucoseDistribution(
  entries: Entry[],
  bins: DistributionBin[] = DEFAULT_DISTRIBUTION_BINS
): DistributionDataPoint[] {
  // Extract glucose values (handling different entry formats)
  const glucoseValues = entries.map(entry => entry.sgv || entry.mgdl || 0);

  return calculateDistributionFromValues(glucoseValues, bins);
}

/**
 * Calculate glucose distribution from raw glucose values
 */
export function calculateGlucoseDistributionFromValues(
  glucoseValues: number[],
  bins: DistributionBin[] = DEFAULT_DISTRIBUTION_BINS
): DistributionDataPoint[] {
  return calculateDistributionFromValues(glucoseValues, bins);
}
