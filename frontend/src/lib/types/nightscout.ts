/** Shared types for Nightscout frontend */

export interface SGVEntry {
  _id: string;
  type: "sgv";
  date: number;
  mills: number;
  sgv: number; // Glucose value is in 'sgv' field
  delta?: number;
  direction?: string;
  filtered?: number;
  unfiltered?: number;
  device?: string;
}

export interface MBGEntry {
  _id: string;
  type: "mbg";
  date: number;
  mills: number;
  mgdl: number; // Meter blood glucose uses 'mgdl' field
  device?: string;
}

export interface CalibrationEntry {
  _id: string;
  type: "cal";
  date: number;
  mills: number;
  slope: number;
  intercept: number;
  scale: number;
  device?: string;
}
export interface TreatmentEntry {
  _id: string;
  date: number;
  mills: number;
  created_at: string;
  eventType: string;
  enteredBy?: string;
  insulin?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  glucose?: number;
  glucoseType?: string;
  notes?: string;
  duration?: number;
  percent?: number;
  absolute?: number;
  profile?: string;
  temp?: "absolute" | "percent";
  sensorCode?: string;
  device?: string;
}

export interface TimeInRanges {
  veryLow: number;
  low: number;
  target: number;
  tightTimeInRange: number; // 70-140 mg/dL
  high: number;
  veryHigh: number;
}

export interface DayStats {
  date: Date;
  averageGlucose: number;
  timeInRanges: TimeInRanges;
}

// Chart data point for glucose with timestamp
export interface GlucoseDataPoint {
  x: number; // timestamp
  y: number; // glucose value
  date: Date;
  sgv: number;
}

// Treatment summary for day-to-day report
export interface TreatmentSummary {
  totalInsulin: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  bolusCount: number;
  basalEvents: number;
  mealEvents: number;
}

export interface DistributionDataPoint {
  range: string;
  count: number;
  percent: number;
}
