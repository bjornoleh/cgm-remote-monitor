// Store common type definitions for report components

export interface Thresholds {
  bgSevereLow: number;
  bgLow: number;
  bgTargetBottom: number;
  bgTargetTop: number;
  bgTightTargetTop: number;
  bgHigh: number;
  bgSevereHigh: number;
}

export interface ChartDataItem {
  timestamp: number;
  date: Date; // This is a Date object
  glucoseValue: number;
  timeString: string;
  _id: string;
}

// Base treatment interface containing common fields from server data
export interface BaseTreatment {
  _id: string;
  eventType: string;
  insulin?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  notes?: string;
  glucoseContext?: number; // Glucose value at the time of treatment
  duration?: number; // For temp basals, etc.
  percent?: number; // For temp basals
  rate?: number; // For temp basals
  absolute?: number; // For temp basals
}

// Server treatment data with timestamp and optional created_at/date fields
export interface ServerTreatment extends BaseTreatment {
  timestamp: number; // Unix timestamp
  created_at?: string; // ISO date string, optional since may not always be present
  date?: string; // Often a string representation of the date part or full ISO, optional
}

// Client-side treatment data for charting/display with processed date
export interface TreatmentDataItem extends BaseTreatment {
  timestamp: number;
  date: Date; // Processed Date object for client use
  glucoseValue?: number; // Used for plotting context, optional (alias for glucoseContext)
}

export interface ProcessedGlucoseEntry {
  timestamp: number; // Unix timestamp
  glucoseValue: number; // SGV
  timeString: string; // Formatted time string
  _id: string;
  // Potentially other fields if processed/added by server
}

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
  averageGlucose: number;
  minGlucose: number;
  maxGlucose: number;
  stdDev: number | null;
  timeInRanges: TimeInRangeMetrics;
  glucoseData: ProcessedGlucoseEntry[]; // Array of glucose readings for the day
  treatments: ServerTreatment[]; // Array of treatments for the day
  treatmentSummary: {
    totalInsulin: number;
    totalCarbs: number;
    totalProtein: number;
    totalFat: number;
    bolusCount: number;
    mealEvents: number;
  };
}

// Type for items in dailyChartData in +page.svelte
// It's essentially DayToDayDailyData augmented with client-side processed chartData and treatmentData
export interface DailyChartDataPoint extends DayToDayDailyData {
  chartData: ChartDataItem[];
  treatmentData: TreatmentDataItem[];
}
