/**
 * Calculate percentile for a sorted array
 */
export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const index = (p / 100) * (arr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (upper >= arr.length) return arr[arr.length - 1];
  return arr[lower] * (1 - weight) + arr[upper] * weight;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((sum, value) => sum + value, 0) / arr.length;
  const variance = arr.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Calculate outliers for box plot (values beyond 1.5 * IQR)
 */
export function calculateOutliers(values: number[], q1: number, q3: number): {
  outliers: number[];
  lowerBound: number;
  upperBound: number;
} {
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = values.filter(val => val < lowerBound || val > upperBound);

  return { outliers, lowerBound, upperBound };
}
