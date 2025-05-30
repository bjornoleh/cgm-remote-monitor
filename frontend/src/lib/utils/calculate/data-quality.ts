import type { Entry } from '../../../app.d.ts';
import { SENSOR_SPECS, type AnalysisConfig } from './time-in-range';

/**
 * Quality assessment metrics interface
 */
export interface DataQuality {
  totalReadings: number;
  missingReadings: number;
  dataCompleteness: number;
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
      gapAnalysis: { gaps: [], longestGap: 0, averageGap: 0 },
      noiseLevel: 0,
      calibrationEvents: 0,
      sensorWarmups: 0
    };
  }

  const sensorInterval = SENSOR_SPECS[config.sensorType as keyof typeof SENSOR_SPECS]?.interval || 5;
  const expectedInterval = sensorInterval * 60 * 1000; // Convert to milliseconds

  const gaps: Array<{ start: number; end: number; duration: number }> = [];
  let totalGapTime = 0;
  let noiseSum = 0;
  let noiseCount = 0;
  let calibrationEvents = 0;
  let sensorWarmups = 0;

  // Analyze gaps between readings
  for (let i = 1; i < entries.length; i++) {
    const prevTime = entries[i - 1].mills || entries[i - 1].date;
    const currTime = entries[i].mills || entries[i].date;
    const gap = currTime - prevTime;

    if (gap > expectedInterval * 1.5) { // Gap larger than 1.5x expected interval
      const gapMinutes = gap / (60 * 1000);
      gaps.push({
        start: prevTime,
        end: currTime,
        duration: gapMinutes
      });
      totalGapTime += gapMinutes;
    }

    // Analyze noise (difference between filtered and unfiltered)
    const entry = entries[i];
    if (entry.filtered && entry.unfiltered) {
      noiseSum += Math.abs(entry.filtered - entry.unfiltered);
      noiseCount++;
    }

    // Count calibration events (simplified detection)
    if (entry.type === 'cal') {
      calibrationEvents++;
    }

    // Count sensor warmups (simplified detection)
    if (entry.type === 'sensor') {
      sensorWarmups++;
    }
  }

  const totalTimeSpan = (entries[entries.length - 1].mills || entries[entries.length - 1].date) -
                       (entries[0].mills || entries[0].date);
  const expectedReadings = Math.floor(totalTimeSpan / expectedInterval);
  const missingReadings = Math.max(0, expectedReadings - entries.length);
  const dataCompleteness = entries.length / Math.max(1, expectedReadings) * 100;

  const longestGap = gaps.length > 0 ? Math.max(...gaps.map(g => g.duration)) : 0;
  const averageGap = gaps.length > 0 ? totalGapTime / gaps.length : 0;
  const noiseLevel = noiseCount > 0 ? noiseSum / noiseCount : 0;

  return {
    totalReadings: entries.length,
    missingReadings,
    dataCompleteness: Math.round(dataCompleteness * 10) / 10,
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
