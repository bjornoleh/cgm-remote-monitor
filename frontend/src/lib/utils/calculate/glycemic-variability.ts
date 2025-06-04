import type { Entry, Sgv } from '$lib';
import { SENSOR_SPECS } from './time-in-range';

/**
 * Glycemic variability metrics interface
 */
export interface GlycemicVariability {
  /** Traditional measure of dispersion, standardized for mean; Measures short-term, within-day variability */
  coefficientOfVariation: number;
  /** Traditional measure of dispersion; Measures short-term, within-day variability */
  standardDeviation: number;
  /** Average of all glycemic excursions (except excursion having value <1 SD from mean glucose) in a 24 h time period; Captures short-term, within-day variability */
  meanAmplitudeGlycemicExcursions: number;
  /** Standard deviation of summated difference between current observation and previous observation; Captures short-term, within-day variability */
  continuousOverlappingNetGlycemicAction: number;
  averageDailyRiskRange: number;
  labilityIndex: number;
  jIndex: number;
  /** High Blood Glucose Index - risk index for hyperglycemia */
  highBloodGlucoseIndex: number;
  /** Low Blood Glucose Index - risk index for hypoglycemia */
  lowBloodGlucoseIndex: number;
  /** Glycemic Variability Index - measures glucose line distance traveled; 1.0-1.2 low, 1.2-1.5 modest, >1.5 high variability */
  glycemicVariabilityIndex: number;
  /** Patient Glycemic Status - combines GVI, mean glucose, and time in range; ≤35 excellent (non-diabetic), 35-100 good, 100-150 poor, >150 very poor */
  patientGlycemicStatus: number;
  /** Estimated A1C from average glucose */
  estimatedA1c: number;
}

/**
 * Calculate estimated A1C from average glucose
 * Using the formula: A1C = (average glucose + 46.7) / 28.7
 */
export function calculateEstimatedA1C(averageGlucose: number): number {
  if (averageGlucose === 0) return 0;
  const a1c = (averageGlucose + 46.7) / 28.7;
  return a1c
}

/**
 * Calculate glycemic variability metrics
 */
export function calculateGlycemicVariability(values: number[], entries: Entry[]): GlycemicVariability {
  if (values.length < 2) {
    throw new Error('Not enough data points to calculate glycemic variability metrics');
  }
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = (standardDeviation / mean) * 100;

  const mage = calculateMAGE(values);
  const conga = calculateCONGA(values, 2);
  const adrr = calculateADRR(values);
  const labilityIndex = calculateLabilityIndex(entries);
  const jIndex = calculateJIndex(values, mean);
  const hbgi = calculateHBGI(values);
  const lbgi = calculateLBGI(values);
  const gvi = calculateGVI(values, entries);
  const pgs = calculatePGS(values, gvi, mean);

  return {
    coefficientOfVariation: Math.round(coefficientOfVariation * 10) / 10,
    standardDeviation: Math.round(standardDeviation * 10) / 10,
    meanAmplitudeGlycemicExcursions: Math.round(mage * 10) / 10,
    continuousOverlappingNetGlycemicAction: Math.round(conga * 10) / 10,
    averageDailyRiskRange: Math.round(adrr * 10) / 10,
    labilityIndex: Math.round(labilityIndex * 10) / 10,
    jIndex: Math.round(jIndex * 10) / 10,
    highBloodGlucoseIndex: Math.round(hbgi * 100) / 100,
    lowBloodGlucoseIndex: Math.round(lbgi * 100) / 100,
    glycemicVariabilityIndex: Math.round(gvi * 100) / 100,
    patientGlycemicStatus: Math.round(pgs * 10) / 10,
    estimatedA1c: calculateEstimatedA1C(mean)
  };
}

/**
 * Calculate MAGE (Mean Amplitude of Glycemic Excursions)
 */
export function calculateMAGE(values: number[]): number {
  if (values.length < 3) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const sd = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

  const excursions: number[] = [];
  let currentDirection: 'up' | 'down' | null = null;
  let lastTurningPoint = values[0];

  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const newDirection: 'up' | 'down' | null = diff > 0 ? 'up' : diff < 0 ? 'down' : currentDirection;

    if (newDirection !== currentDirection && currentDirection !== null) {
      const excursion = Math.abs(values[i - 1] - lastTurningPoint);
      if (excursion > sd) {
        excursions.push(excursion);
      }
      lastTurningPoint = values[i - 1];
    }

    currentDirection = newDirection;
  }

  return excursions.length > 0 ? excursions.reduce((sum, ex) => sum + ex, 0) / excursions.length : 0;
}

/**
 * Calculate CONGA (Continuous Overlapping Net Glycemic Action)
 */
export function calculateCONGA(values: number[], hours: number): number {
  const interval = SENSOR_SPECS.GENERIC_5MIN.interval;
  const pointsPerHour = 60 / interval;
  const windowSize = hours * pointsPerHour;

  if (values.length < windowSize) return 0;

  const differences: number[] = [];
  for (let i = 0; i <= values.length - windowSize; i++) {
    const diff = values[i + windowSize - 1] - values[i];
    differences.push(Math.pow(diff, 2));
  }

  const meanSquaredDiff = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
  return Math.sqrt(meanSquaredDiff);
}

/**
 * Calculate ADRR (Average Daily Risk Range)
 */
export function calculateADRR(values: number[]): number {
  const logTransformed = values.map(val => Math.log(val));
  const mean = logTransformed.reduce((sum, val) => sum + val, 0) / logTransformed.length;
  const variance = logTransformed.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / logTransformed.length;

  return Math.sqrt(variance) * 100;
}

/**
 * Calculate Lability Index
 */
export function calculateLabilityIndex(entries: Sgv[]): number {
  if (entries.length < 2) return 0;

  let totalChange = 0;
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1].sgv || entries[i - 1].mgdl || 0;
    const curr = entries[i].sgv || entries[i].mgdl || 0;
    totalChange += Math.pow(curr - prev, 2);
  }

  return Math.sqrt(totalChange / (entries.length - 1));
}

/**
 * Calculate J-Index
 */
export function calculateJIndex(values: number[], mean: number): number {
  const targetMean = 112; // Target glucose level in mg/dL
  const meanComponent = 0.324 * Math.pow(mean - targetMean, 2);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const variabilityComponent = 0.0018 * variance;

  return meanComponent + variabilityComponent;
}

/**
 * Calculate HBGI (High Blood Glucose Index)
 * Risk index for hyperglycemia based on Kovatchev et al. methodology
 * Higher values indicate greater risk of high glucose episodes
 * Low (HBGI ≤4.5), Moderate (4.5 <HBGI ≤9.0), and High (HBGI >9.0).
 */
export function calculateHBGI(values: number[]): number {
  if (values.length === 0) return 0;

  const riskSum = values.reduce((sum, glucose) => {
    // Kovatchev formula: f(BG) = 1.084 * (ln(BG/18)^1.084 - 1.928)
    // The constant 1.928 ensures f(112.5 mg/dL) = 0 (neutral point)
    const bgInMmol = glucose / 18;
    const logBG = Math.log(bgInMmol);
    const fBG = 1.084 * (Math.pow(logBG, 1.084) - 1.928);

    const risk = fBG > 0 ? 10 * Math.pow(fBG, 2) : 0;
    return sum + risk;
  }, 0);

  return riskSum / values.length;
}

/**
 * Calculate LBGI (Low Blood Glucose Index)
 * Risk index for hypoglycemia based on Kovatchev et al. methodology
 * Higher values indicate greater risk of low glucose episodes
 * Minimal (LBGI ≤1.1), Low (1.1 <LBGI ≤2.5), Moderate (2.5 < LBGI ≤5), and High (LBGI >5.0)
 */
export function calculateLBGI(values: number[]): number {
  if (values.length === 0) return 0;

  const riskSum = values.reduce((sum, glucose) => {
    // Kovatchev formula: f(BG) = 1.084 * (ln(BG/18)^1.084 - 1.928)
    // The constant 1.928 ensures f(112.5 mg/dL) = 0 (neutral point)
    const bgInMmol = glucose / 18;
    const logBG = Math.log(bgInMmol);
    const fBG = 1.084 * (Math.pow(logBG, 1.084) - 1.928);

    const risk = fBG < 0 ? 10 * Math.pow(fBG, 2) : 0;
    return sum + risk;
  }, 0);

  return riskSum / values.length;
}

/**
 * Calculate GVI (Glycemic Variability Index)
 * Measures the distance traveled by the glucose line if stretched out
 * GVI = 1.0-1.2: low variability (non-diabetic)
 * GVI = 1.2-1.5: modest variability
 * GVI > 1.5: high glycemic variability
 * @copyright Dexcom
 * @see https://web.archive.org/web/20160523152519/http://www.healthline.com/diabetesmine/a-new-view-of-glycemic-variability-how-long-is-your-line#1
 */
export function calculateGVI(values: number[], entries: Sgv[]): number {
  if (values.length < 2 || entries.length < 2) return 1.0;

  let actualDistance = 0;
  let idealTime = 0;

  for (let i = 0; i < entries.length - 1; i++) {
    const currentEntry = entries[i];
    const nextEntry = entries[i + 1];

    const currentValue = currentEntry.sgv || currentEntry.mgdl || 0;
    const nextValue = nextEntry.sgv || nextEntry.mgdl || 0;

    if (currentValue <= 0 || nextValue <= 0) continue;

    const timeDelta = ((nextEntry.mills || nextEntry.date) - (currentEntry.mills || currentEntry.date)) / (1000 * 60);

    if (timeDelta > 15) continue;

    const glucoseDelta = Math.abs(nextValue - currentValue);
    const distance = Math.sqrt(Math.pow(timeDelta, 2) + Math.pow(glucoseDelta, 2));
    actualDistance += distance;
    idealTime += timeDelta;
  }

  if (idealTime === 0) return 1.0;

  const idealDistance = idealTime;
  return actualDistance / idealDistance;
}

/**
 * Calculate PGS (Patient Glycemic Status)
 * Combines GVI + mean glucose + percentage of time in range
 * PGS ≤ 35: excellent glycemic status (non-diabetic)
 * PGS 35-100: good glycemic status (diabetic)
 * PGS 100-150: poor glycemic status (diabetic)
 * PGS > 150: very poor glycemic status (diabetic)
 * @copyright Dexcom
 * @see https://web.archive.org/web/20160523152519/http://www.healthline.com/diabetesmine/a-new-view-of-glycemic-variability-how-long-is-your-line#1
 */
export function calculatePGS(values: number[], gvi: number, meanGlucose: number): number {
  if (values.length === 0) return 0;

  const targetLow = 70;
  const targetHigh = 180;

  const inRangeCount = values.filter(val => val >= targetLow && val <= targetHigh).length;
  const percentTimeInRange = inRangeCount / values.length;

  return gvi * meanGlucose * (1 - percentTimeInRange);
}
