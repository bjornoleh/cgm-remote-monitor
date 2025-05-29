/**
 * Shared types for Nightscout frontend
 */

export interface SGVEntry {
  _id: string;
  type: 'sgv';
  date: number;
  mills: number;
  sgv: number;  // Glucose value is in 'sgv' field
  delta?: number;
  direction?: string;
  filtered?: number;
  unfiltered?: number;
  device?: string;
}

export interface MBGEntry {
  _id: string;
  type: 'mbg';
  date: number;
  mills: number;
  mgdl: number;  // Meter blood glucose uses 'mgdl' field
  device?: string;
}

export interface CalibrationEntry {
  _id: string;
  type: 'cal';
  date: number;
  mills: number;
  slope: number;
  intercept: number;
  scale: number;
  device?: string;
}

export interface TimeInRanges {
  veryLow: number;
  low: number;
  target: number;
  high: number;
  veryHigh: number;
}

export interface DistributionDataPoint {
  range: string;
  count: number;
  percent: number;
}
