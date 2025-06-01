// Store common type definitions for report components

import type { Entry, Treatment } from '$lib';
import type { TreatmentSummary } from '$lib/utils/calculate/treatment-stats';
import type { GlucoseAnalytics } from '$lib/utils/glucose-analytics';

export interface Thresholds {
  bgSevereLow: number;
  bgLow: number;
  bgTargetBottom: number;
  bgTargetTop: number;
  bgTightTargetBottom?: number;
  bgTightTargetTop: number;
  bgHigh: number;
  bgSevereHigh: number;
}

// Augmented Treatment interface with additional fields for enhanced functionality


export interface TimeInRangeMetrics {
  percentages: {
    target: number;
    tightTarget?: number; // If calculated
    low: number;
    severeLow: number;
    high: number;
    severeHigh: number;
  };
  timeInTargetMinutes?: number;
  timeInLowMinutes?: number;
  timeInHighMinutes?: number;
  // other relevant TIR fields
}

export interface DayToDayDailyData {
  date: string; // YYYY-MM-DD format
  readingsCount: number;
  analytics: GlucoseAnalytics; // Comprehensive glucose analytics
  trend: "rising" | "falling" | "stable";
  glucoseData: Entry[]; // Array of glucose readings for the day
  treatments: Treatment[]; // Array of treatments for the day
  treatmentSummary: TreatmentSummary;
}
