import { apiGet } from '$lib/api';
import type { SGVEntry } from '$lib/types/nightscout';
import type { Treatment } from '$lib/stores/client-state.svelte.ts';
import type { HourlyStats, HourlyBoxPlotData } from './types.js';
import { percentile, standardDeviation, calculateOutliers } from './statistics.js';
import { calculateIOBForTime } from './iob.js';

/**
 * Process hourly statistics from SGV data
 */
export async function processHourlyStats(
  fetch: typeof globalThis.fetch,
  startDate: Date,
  endDate: Date
): Promise<{ hourlyStats: HourlyStats[]; boxPlotData: HourlyBoxPlotData[] }> {
  // Fetch SGV data
  const sgvResponse = await apiGet<SGVEntry[]>(fetch, '/api/v1/entries.json', {
    params: {
      'find[type]': 'sgv',
      'find[date][$gte]': startDate.getTime().toString(),
      'find[date][$lte]': endDate.getTime().toString(),
      count: '10000'
    }
  });

  // Fetch treatment data for IOB calculations
  const treatmentResponse = await apiGet<Treatment[]>(fetch, '/api/v1/treatments.json', {
    params: {
      'find[created_at][$gte]': new Date(startDate.getTime() - 6 * 60 * 60 * 1000).toISOString(), // Include 6 hours before for IOB
      'find[created_at][$lte]': endDate.toISOString(),
      count: '10000'
    }
  });

  const readings = sgvResponse.success ? sgvResponse.data || [] : [];
  const treatments = treatmentResponse.success ? treatmentResponse.data || [] : [];

  // Group readings by hour (0-23)
  const hourlyData: { [hour: number]: number[] } = {};
  for (let i = 0; i < 24; i++) {
    hourlyData[i] = [];
  }

  readings.forEach(reading => {
    if (reading.sgv && reading.sgv > 0) {
      const date = new Date(reading.date || reading.mills);
      const hour = date.getHours();
      hourlyData[hour].push(reading.sgv);
    }
  });

  // Calculate statistics for each hour
  const hourlyStats: HourlyStats[] = [];
  const boxPlotData: HourlyBoxPlotData[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const values = hourlyData[hour];
    const sortedValues = [...values].sort((a, b) => a - b);

    if (sortedValues.length === 0) {
      // No data for this hour
      const emptyStats: HourlyStats = {
        hour,
        readingsCount: 0,
        average: 0,
        min: 0,
        quartile25: 0,
        median: 0,
        quartile75: 0,
        max: 0,
        standardDeviation: 0,
        basalIob: 0,
        tempIob: 0,
        glucoseValues: []
      };
      hourlyStats.push(emptyStats);

      const emptyBoxPlot: HourlyBoxPlotData = {
        hour,
        min: 0,
        q1: 0,
        median: 0,
        q3: 0,
        max: 0,
        outliers: []
      };
      boxPlotData.push(emptyBoxPlot);
      continue;
    }

    const average = sortedValues.reduce((sum, val) => sum + val, 0) / sortedValues.length;
    const min = sortedValues[0];
    const max = sortedValues[sortedValues.length - 1];
    const quartile25 = percentile(sortedValues, 25);
    const median = percentile(sortedValues, 50);
    const quartile75 = percentile(sortedValues, 75);
    const stdDev = standardDeviation(sortedValues);

    // Calculate IOB for this hour (using middle of hour as representative time)
    const hourMiddleTime = new Date(startDate);
    hourMiddleTime.setHours(hour, 30, 0, 0);
    const { basalIob, tempIob } = calculateIOBForTime(treatments, hourMiddleTime.getTime());

    // Calculate outliers for box plot
    const { outliers, lowerBound, upperBound } = calculateOutliers(sortedValues, quartile25, quartile75);

    const stats: HourlyStats = {
      hour,
      readingsCount: sortedValues.length,
      average: Math.round(average * 10) / 10,
      min,
      quartile25: Math.round(quartile25 * 10) / 10,
      median: Math.round(median * 10) / 10,
      quartile75: Math.round(quartile75 * 10) / 10,
      max,
      standardDeviation: Math.round(stdDev * 10) / 10,
      basalIob: Math.round(basalIob * 100) / 100,
      tempIob: Math.round(tempIob * 100) / 100,
      glucoseValues: values
    };
    hourlyStats.push(stats);

    const boxPlot: HourlyBoxPlotData = {
      hour,
      min: Math.max(min, lowerBound), // Don't include outliers in whiskers
      q1: quartile25,
      median,
      q3: quartile75,
      max: Math.min(max, upperBound), // Don't include outliers in whiskers
      outliers
    };
    boxPlotData.push(boxPlot);
  }

  return { hourlyStats, boxPlotData };
}
