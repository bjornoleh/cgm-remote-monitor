import type { Entry } from '../../../app.d.ts';
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
}

/**
 * Calculate glycemic variability metrics
 */
export function calculateGlycemicVariability(values: number[], entries: Entry[]): GlycemicVariability {
  if (values.length < 2) {
    return {
      coefficientOfVariation: 0,
      standardDeviation: 0,
      meanAmplitudeGlycemicExcursions: 0,
      continuousOverlappingNetGlycemicAction: 0,
      averageDailyRiskRange: 0,
      labilityIndex: 0,
      jIndex: 0,
      highBloodGlucoseIndex: 0,
      lowBloodGlucoseIndex: 0,
      glycemicVariabilityIndex: 0,
      patientGlycemicStatus: 0
    };
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = (standardDeviation / mean) * 100;

  // MAGE (Mean Amplitude of Glycemic Excursions)
  const mage = calculateMAGE(values);

  // CONGA (Continuous Overlapping Net Glycemic Action)
  const conga = calculateCONGA(values, 2); // 2-hour CONGA

  // ADRR (Average Daily Risk Range) - simplified calculation
  const adrr = calculateADRR(values);

  // Lability Index
  const labilityIndex = calculateLabilityIndex(entries);

  // J-Index
  const jIndex = calculateJIndex(values, mean);

  // HBGI (High Blood Glucose Index)
  const hbgi = calculateHBGI(values);

  // LBGI (Low Blood Glucose Index)
  const lbgi = calculateLBGI(values);

  // GVI (Glycemic Variability Index) - new metric
  const gvi = calculateGVI(values, entries);
  // PGS (Patient Glycemic Status) - new metric
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
    patientGlycemicStatus: Math.round(pgs * 10) / 10
  };
}

/**
 * MAGE (Mean Amplitude of Glycemic Excursions)
 * Average of all glycemic excursions (except excursion having value <1 SD from mean glucose) in a 24 h time period; Captures short-term, within-day variability
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
 * Standard deviation of summated difference between current observation and previous observation; Captures short-term, within-day variability
 */
export function calculateCONGA(values: number[], hours: number): number {
  const interval = SENSOR_SPECS.GENERIC_5MIN.interval; // Assume 5-min intervals for CONGA
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
  // Simplified ADRR calculation
  const logTransformed = values.map(val => Math.log(val));
  const mean = logTransformed.reduce((sum, val) => sum + val, 0) / logTransformed.length;
  const variance = logTransformed.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / logTransformed.length;

  return Math.sqrt(variance) * 100;
}

/**
 * Calculate Lability Index
 */
export function calculateLabilityIndex(entries: Entry[]): number {
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
 */
export function calculateHBGI(values: number[]): number {
  if (values.length === 0) return 0;

  const riskSum = values.reduce((sum, glucose) => {
    // Convert glucose to risk scale using f(BG) transformation
    const alpha = 1.084;
    const beta = 5.381;
    const gamma = 1.509;

    // Apply log transformation: f(BG) = alpha * (ln(glucose)^beta - gamma)
    const fBG = alpha * (Math.pow(Math.log(glucose), beta) - gamma);

    // Calculate risk function: r(BG) = 10 * f(BG)^2 if f(BG) > 0, else 0
    const risk = fBG > 0 ? 10 * Math.pow(fBG, 2) : 0;

    return sum + risk;
  }, 0);

  return riskSum / values.length;
}

/**
 * Calculate LBGI (Low Blood Glucose Index)
 * Risk index for hypoglycemia based on Kovatchev et al. methodology
 * Higher values indicate greater risk of low glucose episodes
 */
export function calculateLBGI(values: number[]): number {
  if (values.length === 0) return 0;

  const riskSum = values.reduce((sum, glucose) => {
    // Convert glucose to risk scale using f(BG) transformation
    const alpha = 1.084;
    const beta = 5.381;
    const gamma = 1.509;

    // Apply log transformation: f(BG) = alpha * (ln(glucose)^beta - gamma)
    const fBG = alpha * (Math.pow(Math.log(glucose), beta) - gamma);

    // Calculate risk function: r(BG) = 10 * f(BG)^2 if f(BG) < 0, else 0
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
export function calculateGVI(values: number[], entries: Entry[]): number {
  if (values.length < 2 || entries.length < 2) return 1.0;

  // Calculate the actual distance traveled by the glucose line
  let actualDistance = 0;
  let idealTime = 0;

  for (let i = 0; i < entries.length - 1; i++) {
    const currentEntry = entries[i];
    const nextEntry = entries[i + 1];

    const currentValue = currentEntry.sgv || currentEntry.mgdl || 0;
    const nextValue = nextEntry.sgv || nextEntry.mgdl || 0;

    if (currentValue <= 0 || nextValue <= 0) continue;

    // Time delta in minutes
    const timeDelta = ((nextEntry.mills || nextEntry.date) - (currentEntry.mills || currentEntry.date)) / (1000 * 60);

    // Skip if time gap is too large (more than 15 minutes)
    if (timeDelta > 15) continue;

    // Glucose delta
    const glucoseDelta = Math.abs(nextValue - currentValue);

    // Distance using trigonometry: sqrt(time^2 + glucose^2)
    const distance = Math.sqrt(Math.pow(timeDelta, 2) + Math.pow(glucoseDelta, 2));
    actualDistance += distance;
    idealTime += timeDelta;
  }

  if (idealTime === 0) return 1.0;

  // L0 is the ideal distance (just time, no glucose changes)
  const idealDistance = idealTime;

  // GVI is the ratio of actual distance to ideal distance
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

  // Calculate percentage of time in target range (70-180 mg/dL)
  const targetLow = 70;
  const targetHigh = 180;

  const inRangeCount = values.filter(val => val >= targetLow && val <= targetHigh).length;
  const percentTimeInRange = inRangeCount / values.length;

  // PGS formula: GVI × mean glucose × (1 - PTIR)
  // Where PTIR is percentage of time in range as a decimal (0-1)
  return gvi * meanGlucose * (1 - percentTimeInRange);
}
