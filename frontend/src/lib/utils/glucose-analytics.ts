/**
 * Comprehensive Glucose Analytics Library
 *
 * Consolidates all glucose analysis functions across Nightscout reports
 * with support for compression lows, variable sensor intervals, and DIY looping
 */

import type { Entry, Treatment } from '../../app.d.ts';
// Import modular calculation functions and interfaces
import { calculateBasicStats, type BasicGlucoseStats } from './calculate/basic-stats.js';
import {
  calculateTimeInRange,
  type TimeInRangeMetrics,
  SENSOR_SPECS,
  type AnalysisConfig,
  type GlycemicThresholds,
  DEFAULT_THRESHOLDS
} from './calculate/time-in-range.js';
import { calculateGlycemicVariability, type GlycemicVariability } from './calculate/glycemic-variability.js';
import { assessDataQuality, type DataQuality } from './calculate/data-quality.js';
import { detectCompressionLows, type CompressionLowConfig, DEFAULT_COMPRESSION_CONFIG } from './calculate/compression-lows.js';
import { calculateLoopingMetrics, type LoopingMetrics } from './calculate/looping-metrics.js';

// Extended analysis configuration with all options
export interface ExtendedAnalysisConfig extends AnalysisConfig {
  compressionLowConfig: CompressionLowConfig;
  includeLoopingMetrics: boolean;
  units: 'mg/dl' | 'mmol';
}

export const DEFAULT_CONFIG: ExtendedAnalysisConfig = {
  thresholds: DEFAULT_THRESHOLDS,
  sensorType: 'GENERIC_5MIN',
  compressionLowConfig: DEFAULT_COMPRESSION_CONFIG,
  includeLoopingMetrics: false,
  units: 'mg/dl'
};

// Comprehensive analytics result
export interface GlucoseAnalytics {
  basicStats: BasicGlucoseStats;
  timeInRange: TimeInRangeMetrics;
  glycemicVariability: GlycemicVariability;
  dataQuality: DataQuality;
  compressionLows?: Array<{
    start: number;
    end: number;
    duration: number;
    minValue: number;
    recoveryTime: number;
  }>;
  loopingMetrics?: LoopingMetrics;
}

// Re-export commonly used types and constants
export {
  SENSOR_SPECS,
  DEFAULT_THRESHOLDS,
  DEFAULT_COMPRESSION_CONFIG,
  type GlycemicThresholds,
  type AnalysisConfig,
  type CompressionLowConfig,
  type BasicGlucoseStats,
  type TimeInRangeMetrics,
  type GlycemicVariability,
  type DataQuality,
  type LoopingMetrics
};

/**
 * Master glucose analytics function
 * Calculates comprehensive glucose metrics with sensor-specific optimizations
 */
export function analyzeGlucoseData(
  entries: Entry[],
  treatments: Treatment[] = [],
  config: Partial<ExtendedAnalysisConfig> = {}
): GlucoseAnalytics {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const glucoseValues = extractGlucoseValues(entries);

  if (glucoseValues.length === 0) {
    return createEmptyAnalytics();
  }

  const sortedEntries = entries
    .filter(entry => entry.sgv || entry.mgdl)
    .sort((a, b) => (a.mills || a.date) - (b.mills || b.date));

  const basicStats = calculateBasicStats(glucoseValues);
  const timeInRange = calculateTimeInRange(sortedEntries, finalConfig);
  const glycemicVariability = calculateGlycemicVariability(glucoseValues, sortedEntries);
  const dataQuality = assessDataQuality(sortedEntries, finalConfig);

  const analytics: GlucoseAnalytics = {
    basicStats,
    timeInRange,
    glycemicVariability,
    dataQuality
  };

  // Add compression low detection for supported sensors
  const sensorSpec = SENSOR_SPECS[finalConfig.sensorType as keyof typeof SENSOR_SPECS];
  if (sensorSpec && sensorSpec.hasCompressionLows && finalConfig.compressionLowConfig.enabled) {
    analytics.compressionLows = detectCompressionLows(sortedEntries, finalConfig);
  }

  // Add looping metrics if requested and treatments available
  if (finalConfig.includeLoopingMetrics && treatments.length > 0) {
    analytics.loopingMetrics = calculateLoopingMetrics(entries, treatments);
  }

  return analytics;
}

/**
 * Extract glucose values from entries, handling different data formats
 */
function extractGlucoseValues(entries: Entry[]): number[] {
  return entries
    .map(entry => entry.sgv || entry.mgdl || 0)
    .filter(value => value > 0 && value < 600); // Filter out invalid readings
}

/**
 * Create empty analytics structure for cases with no data
 */
function createEmptyAnalytics(): GlucoseAnalytics {
  return {
    basicStats: {
      count: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      standardDeviation: 0,
      percentiles: { p5: 0, p10: 0, p25: 0, p75: 0, p90: 0, p95: 0 }
    },
    timeInRange: {
      percentages: { severeLow: 0, low: 0, target: 0, high: 0, severeHigh: 0 },
      durations: { severeLow: 0, low: 0, target: 0, high: 0, severeHigh: 0 },
      episodes: { severeLow: 0, low: 0, high: 0, severeHigh: 0 }
    },
    glycemicVariability: {
      coefficientOfVariation: 0,
      standardDeviation: 0,
      meanAmplitudeGlycemicExcursions: 0,
      continuousOverlappingNetGlycemicAction: 0,
      averageDailyRiskRange: 0,
      labilityIndex: 0,
      jIndex: 0
    },
    dataQuality: {
      totalReadings: 0,
      missingReadings: 0,
      dataCompleteness: 0,
      gapAnalysis: { gaps: [], longestGap: 0, averageGap: 0 },
      noiseLevel: 0,
      calibrationEvents: 0,
      sensorWarmups: 0
    }  };
}
