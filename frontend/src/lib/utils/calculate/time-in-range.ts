import type { Entry } from '../../../app.d.ts';

/**
 * Time in Range metrics interface
 */
export interface TimeInRangeMetrics {
  percentages: {
    severeLow: number;
    low: number;
    target: number;
    high: number;
    severeHigh: number;
  };
  durations: {
    severeLow: number;
    low: number;
    target: number;
    high: number;
    severeHigh: number;
  };
  episodes: {
    severeLow: number;
    low: number;
    high: number;
    severeHigh: number;
  };
}

/**
 * Glycemic thresholds interface
 */
export interface GlycemicThresholds {
  severeLow: number;
  low: number;
  targetLow: number;
  targetHigh: number;
  high: number;
  severeHigh: number;
}

/**
 * Default glycemic thresholds
 */
export const DEFAULT_THRESHOLDS: GlycemicThresholds = {
  severeLow: 54,
  low: 70,
  targetLow: 70,
  targetHigh: 180,
  high: 180,
  severeHigh: 250
};

/**
 * Analysis configuration interface
 */
export interface AnalysisConfig {
  thresholds: GlycemicThresholds;
  sensorType: string;
}

/**
 * Sensor specifications
 */
export const SENSOR_SPECS = {
  DEXCOM_G6: { interval: 5, name: 'Dexcom G6', hasCompressionLows: false },
  DEXCOM_G7: { interval: 1, name: 'Dexcom G7', hasCompressionLows: false },
  LIBRE_2: { interval: 1, name: 'FreeStyle Libre 2', hasCompressionLows: true },
  LIBRE_3: { interval: 1, name: 'FreeStyle Libre 3', hasCompressionLows: true },
  GENERIC_5MIN: { interval: 5, name: 'Generic 5-minute', hasCompressionLows: false },
  GENERIC_1MIN: { interval: 1, name: 'Generic 1-minute', hasCompressionLows: true }
};

/**
 * Calculate Time in Range metrics with episode detection
 */
export function calculateTimeInRange(entries: Entry[], config: AnalysisConfig): TimeInRangeMetrics {
  if (entries.length === 0) {
    return {
      percentages: { severeLow: 0, low: 0, target: 0, high: 0, severeHigh: 0 },
      durations: { severeLow: 0, low: 0, target: 0, high: 0, severeHigh: 0 },
      episodes: { severeLow: 0, low: 0, high: 0, severeHigh: 0 }
    };
  }

  const { thresholds } = config;
  const sensorInterval = SENSOR_SPECS[config.sensorType as keyof typeof SENSOR_SPECS]?.interval || 5;

  const counts = { severeLow: 0, low: 0, target: 0, high: 0, severeHigh: 0 };
  const episodes = { severeLow: 0, low: 0, high: 0, severeHigh: 0 };
  let currentEpisode: string | null = null;

  for (const entry of entries) {
    const value = entry.sgv || entry.mgdl || 0;
    let range: keyof typeof counts;

    if (value < thresholds.severeLow) {
      range = 'severeLow';
    } else if (value < thresholds.low) {
      range = 'low';
    } else if (value <= thresholds.targetHigh) {
      range = 'target';
    } else if (value <= thresholds.severeHigh) {
      range = 'high';
    } else {
      range = 'severeHigh';
    }

    counts[range]++;

    // Episode detection (new episode if different from current)
    if (range !== 'target' && range !== currentEpisode) {
      if (range === 'severeLow' || range === 'low' || range === 'high' || range === 'severeHigh') {
        episodes[range]++;
      }
      currentEpisode = range;
    } else if (range === 'target') {
      currentEpisode = null;
    }
  }

  const totalReadings = entries.length;
  const percentages = {
    severeLow: Math.round((counts.severeLow / totalReadings) * 100 * 10) / 10,
    low: Math.round((counts.low / totalReadings) * 100 * 10) / 10,
    target: Math.round((counts.target / totalReadings) * 100 * 10) / 10,
    high: Math.round((counts.high / totalReadings) * 100 * 10) / 10,
    severeHigh: Math.round((counts.severeHigh / totalReadings) * 100 * 10) / 10
  };

  const durations = {
    severeLow: counts.severeLow * sensorInterval,
    low: counts.low * sensorInterval,
    target: counts.target * sensorInterval,
    high: counts.high * sensorInterval,
    severeHigh: counts.severeHigh * sensorInterval
  };

  return { percentages, durations, episodes };
}
