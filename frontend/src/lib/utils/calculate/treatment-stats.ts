/**
 * Treatment Statistics Calculation Utilities
 * Provides standardized functions for calculating insulin breakdowns, treatment summaries,
 * and overall treatment statistics based on existing patterns from bolus calculator and treatment processing code.
 */

import type { TimeInRangeMetrics } from './time-in-range';

export interface TreatmentSummary {
  totalInsulin: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  bolusInsulin: number;
  basalInsulin: number;
  treatmentCount: number;
}

export interface InsulinBreakdown {
  bolus: number;
  basal: number;
  total: number;
  bolusPercentage: number;
  basalPercentage: number;
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
 * Calculates daily insulin breakdown for a single day
 * Based on existing patterns in +page.svelte getDailyInsulinBreakdown function
 * Creates a defensive copy to avoid modifying input data
 */
export function calculateDailyInsulinBreakdown(dayData: DayData): InsulinBreakdown {
  // Create defensive copy to avoid modifying input data
  const treatmentsCopy = [...dayData.treatments];

  const bolusInsulin = treatmentsCopy
    .filter(isBolusTreatment)
    .reduce((sum, treatment) => sum + (treatment.insulin || 0), 0);

  const totalDailyInsulin = dayData.treatmentSummary.totalInsulin;
  const basalInsulin = Math.max(0, totalDailyInsulin - bolusInsulin);

  const bolusPercentage = totalDailyInsulin > 0 ? (bolusInsulin / totalDailyInsulin) * 100 : 0;
  const basalPercentage = totalDailyInsulin > 0 ? (basalInsulin / totalDailyInsulin) * 100 : 0;

  return {
    bolus: bolusInsulin,
    basal: basalInsulin,
    total: totalDailyInsulin,
    bolusPercentage,
    basalPercentage,
  };
}

/**
 * Calculates treatment summary for a collection of treatments
 */
export function calculateTreatmentSummary(treatments: Treatment[]): TreatmentSummary {
  const summary: TreatmentSummary = {
    totalInsulin: 0,
    totalCarbs: 0,
    totalProtein: 0,
    totalFat: 0,
    bolusInsulin: 0,
    basalInsulin: 0,
    treatmentCount: 0,
  };

  treatments.forEach((treatment) => {
    // Count treatments with actual data
    if (treatment.insulin || treatment.carbs || treatment.protein || treatment.fat) {
      summary.treatmentCount++;
    }

    // Aggregate insulin
    if (treatment.insulin) {
      summary.totalInsulin += treatment.insulin;

      if (isBolusTreatment(treatment)) {
        summary.bolusInsulin += treatment.insulin;
      }
    }

    // Aggregate macronutrients
    if (treatment.carbs) summary.totalCarbs += treatment.carbs;
    if (treatment.protein) summary.totalProtein += treatment.protein;
    if (treatment.fat) summary.totalFat += treatment.fat;
  });

  // Calculate basal insulin as remainder
  summary.basalInsulin = Math.max(0, summary.totalInsulin - summary.bolusInsulin);

  return summary;
}

/**
 * Calculates overall averages across multiple days
 */
export function calculateOverallAverages(dailyDataPoints: DayData[]): OverallAverages | null {
  if (dailyDataPoints.length === 0) return null;
  const totals = dailyDataPoints.reduce(
    (acc, day) => {
      const insulinBreakdown = calculateDailyInsulinBreakdown(day);
      const totalDailyInsulin = day.treatmentSummary.totalInsulin;

      return {
        totalDailyInsulin: acc.totalDailyInsulin + totalDailyInsulin,
        bolusInsulin: acc.bolusInsulin + insulinBreakdown.bolus,
        basalInsulin: acc.basalInsulin + insulinBreakdown.basal,
        totalCarbs: acc.totalCarbs + day.treatmentSummary.totalCarbs,
        totalProtein: acc.totalProtein + day.treatmentSummary.totalProtein,
        totalFat: acc.totalFat + day.treatmentSummary.totalFat,
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
