import type { HourlyStats } from './types.js';

/**
 * Utility functions for working with hourly statistics
 */

/**
 * Calculate overall statistics from hourly data
 */
export function calculateOverallStats(hourlyStats: HourlyStats[]): {
  totalReadings: number;
  hoursWithData: number;
  averageMedian: number;
  averageP10: number;
  averageP25: number;
  averageP75: number;
  averageP90: number;
  estimatedTIR: number;
} {
  const validHours = hourlyStats.filter(h => h.readingsCount > 0);

  if (validHours.length === 0) {
    return {
      totalReadings: 0,
      hoursWithData: 0,
      averageMedian: 0,
      averageP10: 0,
      averageP25: 0,
      averageP75: 0,
      averageP90: 0,
      estimatedTIR: 0
    };
  }

  const totalReadings = hourlyStats.reduce((sum, hour) => sum + hour.readingsCount, 0);
  const averageMedian = validHours.reduce((sum, hour) => sum + hour.median, 0) / validHours.length;
  const averageP10 = validHours.reduce((sum, hour) => sum + hour.p10, 0) / validHours.length;
  const averageP25 = validHours.reduce((sum, hour) => sum + hour.quartile25, 0) / validHours.length;
  const averageP75 = validHours.reduce((sum, hour) => sum + hour.quartile75, 0) / validHours.length;
  const averageP90 = validHours.reduce((sum, hour) => sum + hour.p90, 0) / validHours.length;

  // Estimate time in range based on IQR being in target range (70-180 mg/dL)
  const targetLow = 70;
  const targetHigh = 180;

  // Calculate how much of the IQR (25th-75th percentile) falls within target range
  const iqrInRange = Math.max(0, Math.min(targetHigh, averageP75) - Math.max(targetLow, averageP25));
  const totalIqr = averageP75 - averageP25;
  const estimatedTIR = totalIqr > 0 ? (iqrInRange / totalIqr) * 50 : 0; // IQR represents ~50% of data

  return {
    totalReadings,
    hoursWithData: validHours.length,
    averageMedian: Math.round(averageMedian * 10) / 10,
    averageP10: Math.round(averageP10 * 10) / 10,
    averageP25: Math.round(averageP25 * 10) / 10,
    averageP75: Math.round(averageP75 * 10) / 10,
    averageP90: Math.round(averageP90 * 10) / 10,
    estimatedTIR: Math.round(Math.max(0, Math.min(100, estimatedTIR)))
  };
}

/**
 * Find the hour with the highest median glucose
 */
export function findPeakGlucoseHour(hourlyStats: HourlyStats[]): HourlyStats | null {
  const validHours = hourlyStats.filter(h => h.readingsCount > 0);

  if (validHours.length === 0) return null;

  return validHours.reduce((peak, current) =>
    current.median > peak.median ? current : peak
  );
}

/**
 * Find the hour with the lowest median glucose
 */
export function findLowestGlucoseHour(hourlyStats: HourlyStats[]): HourlyStats | null {
  const validHours = hourlyStats.filter(h => h.readingsCount > 0);

  if (validHours.length === 0) return null;

  return validHours.reduce((lowest, current) =>
    current.median < lowest.median ? current : lowest
  );
}

/**
 * Get hourly stats formatted for display
 */
export function formatHourlyStatsForDisplay(hourlyStats: HourlyStats[]): Array<{
  hour: string;
  readingsCount: number;
  p10: string;
  p25: string;
  median: string;
  p75: string;
  p90: string;
  range: string;
}> {
  return hourlyStats.map(stats => ({
    hour: `${stats.hour.toString().padStart(2, '0')}:00`,
    readingsCount: stats.readingsCount,
    p10: stats.readingsCount > 0 ? stats.p10.toString() : '-',
    p25: stats.readingsCount > 0 ? stats.quartile25.toString() : '-',
    median: stats.readingsCount > 0 ? stats.median.toString() : '-',
    p75: stats.readingsCount > 0 ? stats.quartile75.toString() : '-',
    p90: stats.readingsCount > 0 ? stats.p90.toString() : '-',
    range: stats.readingsCount > 0 ? `${stats.min}-${stats.max}` : '-'
  }));
}

/**
 * Validate hourly stats data
 */
export function validateHourlyStats(hourlyStats: HourlyStats[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (hourlyStats.length !== 24) {
    errors.push(`Expected 24 hours of data, got ${hourlyStats.length}`);
  }

  hourlyStats.forEach((stats, index) => {
    if (stats.hour !== index) {
      errors.push(`Hour ${index} has incorrect hour value: ${stats.hour}`);
    }

    if (stats.readingsCount > 0) {
      // Validate percentile ordering
      if (stats.p10 > stats.quartile25) {
        errors.push(`Hour ${stats.hour}: p10 (${stats.p10}) > p25 (${stats.quartile25})`);
      }
      if (stats.quartile25 > stats.median) {
        errors.push(`Hour ${stats.hour}: p25 (${stats.quartile25}) > median (${stats.median})`);
      }
      if (stats.median > stats.quartile75) {
        errors.push(`Hour ${stats.hour}: median (${stats.median}) > p75 (${stats.quartile75})`);
      }
      if (stats.quartile75 > stats.p90) {
        errors.push(`Hour ${stats.hour}: p75 (${stats.quartile75}) > p90 (${stats.p90})`);
      }

      // Validate min/max
      if (stats.min > stats.p10) {
        errors.push(`Hour ${stats.hour}: min (${stats.min}) > p10 (${stats.p10})`);
      }
      if (stats.p90 > stats.max) {
        errors.push(`Hour ${stats.hour}: p90 (${stats.p90}) > max (${stats.max})`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}
