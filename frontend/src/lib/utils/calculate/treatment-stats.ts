/**
 * Treatment Statistics Calculation Utilities
 * Provides standardized functions for calculating insulin breakdowns, treatment summaries,
 * and overall treatment statistics based on existing patterns from bolus calculator and treatment processing code.
 */

import type { TimeInRangeMetrics } from './time-in-range';

export interface TreatmentSummary {
  totals: {
    food: {
      carbs: number;
      protein: number;
      fat: number;
    };
    insulin: {
      bolus: number;
      basal: number;
    };
  };
  treatmentCount: number;
}

export interface OverallAverages {
  avgTotalDaily: number;
  avgBolus: number;
  avgBasal: number;
  bolusPercentage: number;
  basalPercentage: number;
  avgCarbs: number;
  avgProtein: number;
  avgFat: number;
  avgTimeInRange: number;
  avgTightTimeInRange: number;
}

export interface Treatment {
  timestamp: number | string;
  eventType?: string;
  insulin?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  duration?: number;
  percent?: number;
  absolute?: number;
  notes?: string;
  _id: string;
  glucoseContext?: number;
}

export interface DayData {
  date: string;
  treatments: Treatment[];
  treatmentSummary: TreatmentSummary;
  timeInRanges: TimeInRangeMetrics;
}

/**
 * Determines if a treatment is a bolus based on actual event types from server data
 * Uses the actual event types discovered from the Nightscout server:
 * Bolus types: "Meal Bolus", "Correction Bolus", "Snack Bolus", "Bolus Wizard", "Combo Bolus"
 * Non-bolus types: "Temp Basal", "BG Check", "Carb Correction", etc.
 */
export function isBolusTreatment(treatment: Treatment): boolean {
  if (!treatment.eventType) {
    // If no event type but has insulin, treat as bolus (fallback for older data)
    return !!(treatment.insulin && treatment.insulin > 0);
  }

  // Check for explicit bolus event types from server data
  const bolusEventTypes = [
    'Meal Bolus',
    'Correction Bolus',
    'Snack Bolus',
    'Bolus Wizard',
    'Combo Bolus'
  ];

  // Check exact matches first
  if (bolusEventTypes.includes(treatment.eventType)) {
    return true;
  }

  // Check for case-insensitive bolus patterns
  const eventTypeLower = treatment.eventType.toLowerCase();
  if (eventTypeLower.includes('bolus') && eventTypeLower !== 'temp basal') {
    return true;
  }

  // Explicitly exclude basal types
  if (eventTypeLower.includes('basal') || eventTypeLower.includes('temp basal')) {
    return false;
  }

  // For other types with insulin, consider as bolus if positive insulin amount
  return !!(treatment.insulin && treatment.insulin > 0);
}

/**
 * Utility functions to calculate values from TreatmentSummary
 */
export function getTotalInsulin(treatmentSummary: TreatmentSummary): number {
  return treatmentSummary.totals.insulin.bolus + treatmentSummary.totals.insulin.basal;
}

export function getBolusPercentage(treatmentSummary: TreatmentSummary): number {
  const total = getTotalInsulin(treatmentSummary);
  return total > 0 ? (treatmentSummary.totals.insulin.bolus / total) * 100 : 0;
}

export function getBasalPercentage(treatmentSummary: TreatmentSummary): number {
  const total = getTotalInsulin(treatmentSummary);
  return total > 0 ? (treatmentSummary.totals.insulin.basal / total) * 100 : 0;
}

/**
 * Calculates treatment summary for a collection of treatments
 */
export function calculateTreatmentSummary(treatments: Treatment[]): TreatmentSummary {
  const summary: TreatmentSummary = {
    totals: {
      food: {
        carbs: 0,
        protein: 0,
        fat: 0,
      },
      insulin: {
        bolus: 0,
        basal: 0,
      },
    },
    treatmentCount: 0,
  };

  treatments.forEach((treatment) => {
    // Count treatments with actual data
    if (treatment.insulin || treatment.carbs || treatment.protein || treatment.fat) {
      summary.treatmentCount++;
    }

    // Aggregate insulin
    if (treatment.insulin) {
      if (isBolusTreatment(treatment)) {
        summary.totals.insulin.bolus += treatment.insulin;
      } else {
        summary.totals.insulin.basal += treatment.insulin;
      }
    }

    // Aggregate macronutrients
    if (treatment.carbs) summary.totals.food.carbs += treatment.carbs;
    if (treatment.protein) summary.totals.food.protein += treatment.protein;
    if (treatment.fat) summary.totals.food.fat += treatment.fat;
  });

  return summary;
}

/**
 * Calculates overall averages across multiple days
 */
export function calculateOverallAverages(dailyDataPoints: DayData[]): OverallAverages | null {
  if (dailyDataPoints.length === 0) return null;

  const totals = dailyDataPoints.reduce(
    (acc, day) => {
      const totalDailyInsulin = getTotalInsulin(day.treatmentSummary);
      const bolusInsulin = day.treatmentSummary.totals.insulin.bolus;
      const basalInsulin = day.treatmentSummary.totals.insulin.basal;

      return {
        totalDailyInsulin: acc.totalDailyInsulin + totalDailyInsulin,
        bolusInsulin: acc.bolusInsulin + bolusInsulin,
        basalInsulin: acc.basalInsulin + basalInsulin,
        totalCarbs: acc.totalCarbs + day.treatmentSummary.totals.food.carbs,
        totalProtein: acc.totalProtein + day.treatmentSummary.totals.food.protein,
        totalFat: acc.totalFat + day.treatmentSummary.totals.food.fat,
        timeInRange: acc.timeInRange + day.timeInRanges.percentages.target,
        tightTimeInRange: acc.tightTimeInRange + (day.timeInRanges.percentages.target > 85 ? day.timeInRanges.percentages.target : 0),
        daysWithData: acc.daysWithData + (totalDailyInsulin > 0 ? 1 : 0),
      };
    },
    {
      totalDailyInsulin: 0,
      bolusInsulin: 0,
      basalInsulin: 0,
      totalCarbs: 0,
      totalProtein: 0,
      totalFat: 0,
      timeInRange: 0,
      tightTimeInRange: 0,
      daysWithData: 0,
    }
  );

  const daysCount = Math.max(totals.daysWithData, 1);
  const avgTotalDaily = totals.totalDailyInsulin / daysCount;
  const avgBolus = totals.bolusInsulin / daysCount;
  const avgBasal = totals.basalInsulin / daysCount;

  return {
    avgTotalDaily,
    avgBolus,
    avgBasal,
    bolusPercentage: avgTotalDaily > 0 ? (avgBolus / avgTotalDaily) * 100 : 0,
    basalPercentage: avgTotalDaily > 0 ? (avgBasal / avgTotalDaily) * 100 : 0,
    avgCarbs: totals.totalCarbs / daysCount,
    avgProtein: totals.totalProtein / daysCount,
    avgFat: totals.totalFat / daysCount,
    avgTimeInRange: totals.timeInRange / dailyDataPoints.length,
    avgTightTimeInRange: totals.tightTimeInRange / dailyDataPoints.length,
  };
}

/**
 * Formats insulin values for display with appropriate precision
 * Based on patterns from boluscalc.js and renderer.js
 */
export function formatInsulinDisplay(value: number): string {
  return value.toFixed(2);
}

/**
 * Formats carb values for display with appropriate precision
 */
export function formatCarbDisplay(value: number): string {
  return value.toFixed(1);
}

/**
 * Formats percentage values for display
 */
export function formatPercentageDisplay(value: number): string {
  return value.toFixed(1);
}

/**
 * Rounds insulin values to pump precision (typically 0.05 units)
 * Based on roundTo function patterns in boluscalc.js
 */
export function roundInsulinToPumpPrecision(value: number, step: number = 0.05): number {
  return Math.round(value / step) * step;
}

/**
 * Validates treatment data for completeness and consistency
 * Based on validation patterns from server treatments processing
 */
export function validateTreatmentData(treatment: Treatment): boolean {
  // Basic validation
  if (!treatment.timestamp || !treatment._id) return false;

  // Check for at least one meaningful value
  if (!treatment.insulin && !treatment.carbs && !treatment.protein && !treatment.fat) {
    return false;
  }

  // Validate numeric values
  if (treatment.insulin && (isNaN(treatment.insulin) || treatment.insulin < 0)) return false;
  if (treatment.carbs && (isNaN(treatment.carbs) || treatment.carbs < 0)) return false;
  if (treatment.protein && (isNaN(treatment.protein) || treatment.protein < 0)) return false;
  if (treatment.fat && (isNaN(treatment.fat) || treatment.fat < 0)) return false;

  return true;
}

/**
 * Filters and cleans treatment data
 * Based on prepareData function patterns in server treatments processing
 */
export function cleanTreatmentData(treatments: Treatment[]): Treatment[] {
  return treatments
    .filter(validateTreatmentData)
    .map((treatment) => ({
      ...treatment,
      insulin: treatment.insulin ? Number(treatment.insulin) : undefined,
      carbs: treatment.carbs ? Number(treatment.carbs) : undefined,
      protein: treatment.protein ? Number(treatment.protein) : undefined,
      fat: treatment.fat ? Number(treatment.fat) : undefined,
    }));
}

/**
 * Legacy treatment summary structure from server
 */
export interface LegacyTreatmentSummary {
  totalInsulin: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  bolusCount: number;
  mealEvents: number;
  bolusInsulin?: number;
  basalInsulin?: number;
  treatmentCount?: number;
}

/**
 * Converts legacy treatment summary to new structured format
 */
export function convertLegacyTreatmentSummary(legacy: LegacyTreatmentSummary): TreatmentSummary {
  // Calculate bolus and basal if not provided
  const bolusInsulin = legacy.bolusInsulin ?? 0;
  const basalInsulin = legacy.basalInsulin ?? Math.max(0, legacy.totalInsulin - bolusInsulin);

  return {
    totals: {
      food: {
        carbs: legacy.totalCarbs,
        protein: legacy.totalProtein,
        fat: legacy.totalFat,
      },
      insulin: {
        bolus: bolusInsulin,
        basal: basalInsulin,
      },
    },
    treatmentCount: legacy.treatmentCount ?? (legacy.bolusCount + legacy.mealEvents),
  };
}
