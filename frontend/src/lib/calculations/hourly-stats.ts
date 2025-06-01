import { apiGet } from '$lib/api';
import type { Sgv } from '$lib';
import type { Treatment } from '$lib'
import type { HourlyStats, HourlyBoxPlotData } from './types.js';
import { percentile, standardDeviation, calculateOutliers } from './statistics.js';
import { calculateIOBForTime } from './iob.js';

/**
 * Fetch SGV data from the API
 */
async function fetchSGVData(
  fetch: typeof globalThis.fetch,
  startDate: Date,
  endDate: Date
): Promise<Sgv[]> {
  const sgvResponse = await apiGet<Sgv[]>(fetch, '/api/v1/entries.json', {
    params: {
      'find[type]': 'sgv',
      'find[date][$gte]': startDate.getTime().toString(),
      'find[date][$lte]': endDate.getTime().toString(),
      count: '10000'
    }
  });

  return sgvResponse.success ? sgvResponse.data || [] : [];
}

/**
 * Fetch treatment data from the API
 */
async function fetchTreatmentData(
  fetch: typeof globalThis.fetch,
  startDate: Date,
  endDate: Date
): Promise<Treatment[]> {
  const treatmentResponse = await apiGet<Treatment[]>(fetch, '/api/v1/treatments.json', {
    params: {
      'find[created_at][$gte]': new Date(startDate.getTime() - 6 * 60 * 60 * 1000).toISOString(), // Include 6 hours before for IOB
      'find[created_at][$lte]': endDate.toISOString(),
      count: '10000'
    }
  });

  return treatmentResponse.success ? treatmentResponse.data || [] : [];
}

/**
 * Group SGV readings by hour (0-23)
 */
function groupReadingsByHour(readings: Sgv[]): { [hour: number]: number[] } {
  const hourlyData: { [hour: number]: number[] } = {};

  // Initialize arrays for each hour
  for (let i = 0; i < 24; i++) {
    hourlyData[i] = [];
  }

  // Group readings by hour
  readings.forEach(reading => {
    if (reading.sgv && reading.sgv > 0) {
      const date = new Date(reading.date || reading.mills);
      const hour = date.getHours();
      hourlyData[hour].push(reading.sgv);
    }
  });

  return hourlyData;
}

/**
 * Calculate statistical percentiles for an hour's data
 */
function calculateHourlyPercentiles(sortedValues: number[]): {
  min: number;
  p10: number;
  quartile25: number;
  median: number;
  quartile75: number;
  p90: number;
  max: number;
  average: number;
  standardDeviation: number;
} {
  if (sortedValues.length === 0) {
    return {
      min: 0,
      p10: 0,
      quartile25: 0,
      median: 0,
      quartile75: 0,
      p90: 0,
      max: 0,
      average: 0,
      standardDeviation: 0
    };
  }

  const average = sortedValues.reduce((sum, val) => sum + val, 0) / sortedValues.length;
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  const p10 = percentile(sortedValues, 10);
  const quartile25 = percentile(sortedValues, 25);
  const median = percentile(sortedValues, 50);
  const quartile75 = percentile(sortedValues, 75);
  const p90 = percentile(sortedValues, 90);
  const stdDev = standardDeviation(sortedValues);

  return {
    min,
    p10: Math.round(p10 * 10) / 10,
    quartile25: Math.round(quartile25 * 10) / 10,
    median: Math.round(median * 10) / 10,
    quartile75: Math.round(quartile75 * 10) / 10,
    p90: Math.round(p90 * 10) / 10,
    max,
    average: Math.round(average * 10) / 10,
    standardDeviation: Math.round(stdDev * 10) / 10
  };
}

/**
 * Create empty stats object for hours with no data
 */
function createEmptyHourlyStats(hour: number): HourlyStats {
  return {
    hour,
    readingsCount: 0,
    average: 0,
    min: 0,
    p10: 0,
    quartile25: 0,
    median: 0,
    quartile75: 0,
    p90: 0,
    max: 0,
    standardDeviation: 0,
    basalIob: 0,
    tempIob: 0,
    glucoseValues: []
  };
}

/**
 * Create empty box plot data for hours with no data
 */
function createEmptyBoxPlotData(hour: number): HourlyBoxPlotData {
  return {
    hour,
    min: 0,
    q1: 0,
    median: 0,
    q3: 0,
    max: 0,
    outliers: []
  };
}

/**
 * Calculate IOB for a specific hour
 */
function calculateHourlyIOB(
  treatments: Treatment[],
  startDate: Date,
  hour: number
): { basalIob: number; tempIob: number } {
  const hourMiddleTime = new Date(startDate);
  hourMiddleTime.setHours(hour, 30, 0, 0);
  const { basalIob, tempIob } = calculateIOBForTime(treatments, hourMiddleTime.getTime());

  return {
    basalIob: Math.round(basalIob * 100) / 100,
    tempIob: Math.round(tempIob * 100) / 100
  };
}

/**
 * Process statistics for a single hour
 */
function processHourlyStatistics(
  hour: number,
  values: number[],
  treatments: Treatment[],
  startDate: Date
): { stats: HourlyStats; boxPlot: HourlyBoxPlotData } {
  const sortedValues = [...values].sort((a, b) => a - b);

  if (sortedValues.length === 0) {
    return {
      stats: createEmptyHourlyStats(hour),
      boxPlot: createEmptyBoxPlotData(hour)
    };
  }

  // Calculate percentiles and basic statistics
  const percentiles = calculateHourlyPercentiles(sortedValues);

  // Calculate IOB for this hour
  const { basalIob, tempIob } = calculateHourlyIOB(treatments, startDate, hour);

  // Calculate outliers for box plot
  const { outliers, lowerBound, upperBound } = calculateOutliers(
    sortedValues,
    percentiles.quartile25,
    percentiles.quartile75
  );

  const stats: HourlyStats = {
    hour,
    readingsCount: sortedValues.length,
    average: percentiles.average,
    min: percentiles.min,
    p10: percentiles.p10,
    quartile25: percentiles.quartile25,
    median: percentiles.median,
    quartile75: percentiles.quartile75,
    p90: percentiles.p90,
    max: percentiles.max,
    standardDeviation: percentiles.standardDeviation,
    basalIob,
    tempIob,
    glucoseValues: values
  };

  const boxPlot: HourlyBoxPlotData = {
    hour,
    min: Math.max(percentiles.min, lowerBound), // Don't include outliers in whiskers
    q1: percentiles.quartile25,
    median: percentiles.median,
    q3: percentiles.quartile75,
    max: Math.min(percentiles.max, upperBound), // Don't include outliers in whiskers
    outliers
  };

  return { stats, boxPlot };
}

/**
 * Process hourly statistics from SGV data
 */
export async function processHourlyStats(
  fetch: typeof globalThis.fetch,
  startDate: Date,
  endDate: Date
): Promise<{ hourlyStats: HourlyStats[]; boxPlotData: HourlyBoxPlotData[] }> {
  // Fetch data from APIs
  const [readings, treatments] = await Promise.all([
    fetchSGVData(fetch, startDate, endDate),
    fetchTreatmentData(fetch, startDate, endDate)
  ]);

  // Group readings by hour
  const hourlyData = groupReadingsByHour(readings);

  // Process statistics for each hour
  const hourlyStats: HourlyStats[] = [];
  const boxPlotData: HourlyBoxPlotData[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const values = hourlyData[hour];
    const { stats, boxPlot } = processHourlyStatistics(hour, values, treatments, startDate);

    hourlyStats.push(stats);
    boxPlotData.push(boxPlot);
  }

  return { hourlyStats, boxPlotData };
}
