import type { Entry } from '$lib';
import { SENSOR_SPECS, type AnalysisConfig } from './time-in-range';

/**
 * Quality assessment metrics interface
 */
export interface DataQuality {
  totalReadings: number;
  missingReadings: number;
  dataCompleteness: number;
  /** How long is the CGM active for over the period of time
   * @example 75
   */
  cgmActivePercent: number;
  gapAnalysis: {
    gaps: Array<{ start: number; end: number; duration: number }>;
    longestGap: number;
    averageGap: number;
  };
  noiseLevel: number;
  calibrationEvents: number;
  sensorWarmups: number;
}

/**
 * Assess data quality metrics
 */
export function assessDataQuality(entries: Entry[], config: AnalysisConfig): DataQuality {
  if (entries.length === 0) {
    return {
      totalReadings: 0,
      missingReadings: 0,
      dataCompleteness: 0,
      cgmActivePercent: 0,
      gapAnalysis: { gaps: [], longestGap: 0, averageGap: 0 },
      noiseLevel: 0,
      calibrationEvents: 0,
      sensorWarmups: 0
    };
  }

  const sensorSpec = SENSOR_SPECS[config.sensorType as keyof typeof SENSOR_SPECS];
  const sensorInterval = sensorSpec?.interval || 5;
  const expectedInterval = sensorInterval * 60 * 1000; // Convert to milliseconds

  const gaps: Array<{ start: number; end: number; duration: number }> = [];
  let totalGapTime = 0;
  let noiseSum = 0;
  let noiseCount = 0;
  let calibrationEvents = 0;
  let sensorWarmups = 0;

  // Analyze gaps between readings
  for (let i = 1; i < entries.length; i++) {
    const prevEntry = entries[i - 1];
    const currEntry = entries[i];

    const prevTime = prevEntry.mills || prevEntry.date || 0;
    const currTime = currEntry.mills || currEntry.date || 0;

    if (typeof prevTime !== 'number' || typeof currTime !== 'number') continue;

    const gap = currTime - prevTime;

    if (gap > expectedInterval * 1.5) { // Gap larger than 1.5x expected interval
      const gapMinutes = gap / (60 * 1000);
      gaps.push({
        start: prevTime,
        end: currTime,
        duration: gapMinutes
      });
      totalGapTime += gapMinutes;
    }    // Analyze noise (difference between filtered and unfiltered) - only for raw SGV entries
    if (currEntry.type === 'sgv' && 'filtered' in currEntry && 'unfiltered' in currEntry) {
      const rawEntry = currEntry as unknown as { filtered?: number; unfiltered?: number };
      const filtered = rawEntry.filtered;
      const unfiltered = rawEntry.unfiltered;
      if (typeof filtered === 'number' && typeof unfiltered === 'number') {
        noiseSum += Math.abs(filtered - unfiltered);
        noiseCount++;
      }
    }

    // Count calibration events
    if (currEntry.type === 'cal') {
      calibrationEvents++;
    }

    // Count sensor-related treatments (approximate sensor warmups)
    if (currEntry.type === 'sgv' && 'sensor' in currEntry) {
      sensorWarmups++;
    }
  }

  // Calculate time span and expected readings based on sensor interval
  const firstTime = entries[0].mills || entries[0].date || 0;
  const lastTime = entries[entries.length - 1].mills || entries[entries.length - 1].date || 0;

  if (typeof firstTime !== 'number' || typeof lastTime !== 'number') {
    return {
      totalReadings: entries.length,
      missingReadings: 0,
      dataCompleteness: 0,
      cgmActivePercent: 0,
      gapAnalysis: { gaps: [], longestGap: 0, averageGap: 0 },
      noiseLevel: 0,
      calibrationEvents,
      sensorWarmups: 0
    };
  }

  const totalTimeSpan = lastTime - firstTime;
  const expectedReadings = Math.floor(totalTimeSpan / expectedInterval) + 1;
  const missingReadings = Math.max(0, expectedReadings - entries.length);
  const dataCompleteness = entries.length / Math.max(1, expectedReadings) * 100;

  // Calculate CGM Active Percentage based on sensor type
  // For CGM Active: percentage of expected readings that were actually received
  const cgmActivePercent = Math.min(100, Math.round(dataCompleteness * 10) / 10);

  const longestGap = gaps.length > 0 ? Math.max(...gaps.map(g => g.duration)) : 0;
  const averageGap = gaps.length > 0 ? totalGapTime / gaps.length : 0;
  const noiseLevel = noiseCount > 0 ? noiseSum / noiseCount : 0;

  return {
    totalReadings: entries.length,
    missingReadings,
    dataCompleteness: Math.round(dataCompleteness * 10) / 10,
    cgmActivePercent,
    gapAnalysis: {
      gaps,
      longestGap: Math.round(longestGap * 10) / 10,
      averageGap: Math.round(averageGap * 10) / 10
    },
    noiseLevel: Math.round(noiseLevel * 10) / 10,
    calibrationEvents,
    sensorWarmups
  };
}

/**
 * Calculate CGM Active percentage for a specific date range
 *
 * This accounts for different sensor types and their expected reading intervals
 */
export function calculateCGMActivePercent(
  entries: Entry[],
  startDate: Date,
  endDate: Date,
  sensorType: string = 'GENERIC_5MIN'
): number {
  if (entries.length === 0) return 0;

  const sensorSpec = SENSOR_SPECS[sensorType as keyof typeof SENSOR_SPECS];
  const sensorInterval = sensorSpec?.interval || 5;

  // Calculate total time span in milliseconds
  const totalTimeSpan = endDate.getTime() - startDate.getTime();

  // Calculate expected readings based on sensor interval
  const expectedReadings = Math.floor(totalTimeSpan / (sensorInterval * 60 * 1000));

  if (expectedReadings === 0) return 0;

  // Count actual readings in the date range
  const actualReadings = entries.filter(entry => {
    const entryTime = entry.mills || entry.date || 0;
    return typeof entryTime === 'number' &&
           entryTime >= startDate.getTime() &&
           entryTime <= endDate.getTime();
  }).length;

  // Calculate percentage, capped at 100%
  const cgmActivePercent = Math.min(100, (actualReadings / expectedReadings) * 100);

  return Math.round(cgmActivePercent * 10) / 10;
}
