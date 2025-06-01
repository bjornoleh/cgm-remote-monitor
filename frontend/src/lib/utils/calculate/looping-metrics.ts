import type { Entry, Treatment } from '$lib';
import { calculateBasicStats } from './basic-stats';

// Extended interfaces for looping data that may not be in the base types
interface ExtendedTreatment extends Treatment {
  iob?: number;
  cob?: number;
  rate?: number;
  absolute?: number;
  duration?: number;
}

interface ExtendedEntry extends Entry {
  prediction?: number;
}

/**
 * DIY Looping metrics interface
 */
export interface LoopingMetrics {
  iob?: {
    values: Array<{ timestamp: number; value: number }>;
    current: number;
    average: number;
    max: number;
  };
  cob?: {
    values: Array<{ timestamp: number; value: number }>;
    current: number;
    average: number;
    max: number;
  };
  tempBasals?: Array<{
    timestamp: number;
    rate: number;
    duration: number;
  }>;
  predictions?: Array<{
    timestamp: number;
    predicted: number;
    actual?: number;
  }>;
}

/**
 * Calculate DIY looping metrics (IOB, COB, predictions)
 */
export function calculateLoopingMetrics(entries: Entry[], treatments: Treatment[]): LoopingMetrics {
  const metrics: LoopingMetrics = {};
  // Extract IOB data from treatments
  const iobTreatments = treatments.filter(t => (t as ExtendedTreatment).iob !== undefined);
  if (iobTreatments.length > 0) {
    const iobValues = iobTreatments.map(t => (t as ExtendedTreatment).iob!).filter((val: number) => !isNaN(val));
    const iobStats = calculateBasicStats(iobValues);

    metrics.iob = {
      values: iobTreatments.map(t => ({
        timestamp: new Date(t.timestamp || t.created_at).getTime(),
        value: (t as ExtendedTreatment).iob!
      })),
      current: iobValues[iobValues.length - 1] || 0,
      average: iobStats.mean,
      max: iobStats.max
    };
  }

  // Extract COB data from treatments
  const cobTreatments = treatments.filter(t => (t as ExtendedTreatment).cob !== undefined);
  if (cobTreatments.length > 0) {
    const cobValues = cobTreatments.map(t => (t as ExtendedTreatment).cob!).filter((val: number) => !isNaN(val));
    metrics.cob = {
      values: cobTreatments.map(t => ({
        timestamp: new Date(t.timestamp || t.created_at).getTime(),
        value: (t as ExtendedTreatment).cob!
      })),
      current: cobValues[cobValues.length - 1] || 0,
      average: cobValues.reduce((sum: number, val: number) => sum + val, 0) / cobValues.length || 0,
      max: Math.max(...cobValues) || 0
    };
  }

  // Extract temp basal data
  const tempBasals = treatments.filter(t => t.eventType === 'Temp Basal' || t.eventType === 'tempbasal');
  if (tempBasals.length > 0) {
    metrics.tempBasals = tempBasals.map(t => ({
      timestamp: new Date(t.timestamp || t.created_at).getTime(),
      rate: (t as ExtendedTreatment).rate || (t as ExtendedTreatment).absolute || 0,
      duration: (t as ExtendedTreatment).duration || 0
    }));
  }

  // Extract prediction data (if available in entries)
  const predictionEntries = entries.filter(e => (e as ExtendedEntry).prediction !== undefined);
  if (predictionEntries.length > 0) {
    metrics.predictions = predictionEntries.map(e => ({
      timestamp: e.mills || e.date,
      predicted: (e as ExtendedEntry).prediction!,
      actual: e.sgv || e.mgdl
    }));
  }

  return metrics;
}
