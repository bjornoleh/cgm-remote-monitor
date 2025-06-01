import type { Entry } from '$lib';
import type { AnalysisConfig } from './time-in-range';

/**
 * Compression low configuration interface
 */
export interface CompressionLowConfig {
  enabled: boolean;
  threshold: number;
  duration: number;
  recovery: number;
}

export const DEFAULT_COMPRESSION_CONFIG: CompressionLowConfig = {
  enabled: true,
  threshold: 40,
  duration: 15,
  recovery: 70
};

/**
 * Detect compression lows for sensors that support it
 */
export function detectCompressionLows(entries: Entry[], config: AnalysisConfig & { compressionLowConfig: CompressionLowConfig }): Array<{
  start: number;
  end: number;
  duration: number;
  minValue: number;
  recoveryTime: number;
}> {
  const { compressionLowConfig } = config;
  const compressionLows: Array<{
    start: number;
    end: number;
    duration: number;
    minValue: number;
    recoveryTime: number;
  }> = [];

  let inCompressionLow = false;
  let compressionStart = 0;
  let minValue = Infinity;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const value = entry.sgv || entry.mgdl || 0;
    const timestamp = entry.mills || entry.date;

    if (!inCompressionLow) {
      // Check if entering compression low
      if (value <= compressionLowConfig.threshold) {
        inCompressionLow = true;
        compressionStart = timestamp;
        minValue = value;
      }
    } else {
      // Already in compression low
      minValue = Math.min(minValue, value);

      // Check if recovering from compression low
      if (value >= compressionLowConfig.recovery) {
        const duration = (timestamp - compressionStart) / (60 * 1000); // Convert to minutes

        if (duration >= compressionLowConfig.duration) {
          compressionLows.push({
            start: compressionStart,
            end: timestamp,
            duration: Math.round(duration * 10) / 10,
            minValue,
            recoveryTime: Math.round(duration * 10) / 10
          });
        }

        inCompressionLow = false;
        minValue = Infinity;
      }
    }
  }

  return compressionLows;
}
