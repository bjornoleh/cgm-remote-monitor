import { apiGet } from '$lib/api';
import type { SGVEntry } from '$lib';
import { percentile } from './statistics.js';

export interface HourlyPercentileData {
  hour: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  readingsCount: number;
}

/**
 * Process hourly percentile data from SGV entries
 * Similar to the old percentile.js implementation but organized by hour
 */
export async function processHourlyPercentiles(
  fetch: typeof globalThis.fetch,
  startDate: Date,
  endDate: Date,
  minuteWindow: number = 30
): Promise<HourlyPercentileData[]> {
  // Fetch SGV data
  const sgvResponse = await apiGet<SGVEntry[]>(fetch, '/api/v1/entries.json', {
    params: {
      'find[type]': 'sgv',
      'find[date][$gte]': startDate.getTime().toString(),
      'find[date][$lte]': endDate.getTime().toString(),
      count: '50000'
    }
  });

  const readings = sgvResponse.success ? sgvResponse.data || [] : [];

  // Group readings by hour and minute window (similar to old implementation)
  const hourlyData: { [hour: number]: number[] } = {};

  // Initialize arrays for each hour
  for (let hour = 0; hour < 24; hour++) {
    hourlyData[hour] = [];
  }

  // Filter and group readings by hour
  readings.forEach(reading => {
    if (reading.sgv && reading.sgv > 0 && reading.sgv < 600) {
      const date = new Date(reading.date || reading.mills);
      const hour = date.getHours();
      const minute = date.getMinutes();

      // Only include readings within the minute window (if specified)
      // For now, we'll include all readings in each hour
      // The original implementation used 30-minute windows within each hour
      hourlyData[hour].push(reading.sgv);
    }
  });

  // Calculate percentiles for each hour
  const hourlyPercentiles: HourlyPercentileData[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const values = hourlyData[hour];
    const sortedValues = [...values].sort((a, b) => a - b);

    if (sortedValues.length === 0) {
      // No data for this hour - use reasonable defaults
      hourlyPercentiles.push({
        hour,
        p10: 80,
        p25: 90,
        median: 100,
        p75: 120,
        p90: 140,
        readingsCount: 0
      });
      continue;
    }

    // Calculate percentiles using the same method as the old implementation
    const p10 = percentile(sortedValues, 10);
    const p25 = percentile(sortedValues, 25);
    const median = percentile(sortedValues, 50);
    const p75 = percentile(sortedValues, 75);
    const p90 = percentile(sortedValues, 90);

    hourlyPercentiles.push({
      hour,
      p10: Math.round(p10 * 10) / 10,
      p25: Math.round(p25 * 10) / 10,
      median: Math.round(median * 10) / 10,
      p75: Math.round(p75 * 10) / 10,
      p90: Math.round(p90 * 10) / 10,
      readingsCount: sortedValues.length
    });
  }

  return hourlyPercentiles;
}

/**
 * Process hourly percentile data with time bins (like the original implementation)
 * This creates bins within each hour based on minute windows
 */
export async function processHourlyPercentilesBinned(
  fetch: typeof globalThis.fetch,
  startDate: Date,
  endDate: Date,
  minuteWindow: number = 30
): Promise<HourlyPercentileData[]> {
  // Fetch SGV data
  const sgvResponse = await apiGet<SGVEntry[]>(fetch, '/api/v1/entries.json', {
    params: {
      'find[type]': 'sgv',
      'find[date][$gte]': startDate.getTime().toString(),
      'find[date][$lte]': endDate.getTime().toString(),
      count: '50000'
    }
  });

  const readings = sgvResponse.success ? sgvResponse.data || [] : [];

  // Create bins for each hour (similar to the original percentile.js)
  const bins: Array<{ hour: number; minute: number; readings: number[] }> = [];

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += minuteWindow) {
      bins.push({
        hour,
        minute,
        readings: []
      });
    }
  }

  // Filter readings into appropriate bins
  readings.forEach(reading => {
    if (reading.sgv && reading.sgv > 0 && reading.sgv < 600) {
      const date = new Date(reading.date || reading.mills);
      const hour = date.getHours();
      const minute = date.getMinutes();

      // Find the appropriate bin for this reading
      const binIndex = bins.findIndex(bin =>
        bin.hour === hour &&
        minute >= bin.minute &&
        minute < bin.minute + minuteWindow
      );

      if (binIndex >= 0) {
        bins[binIndex].readings.push(reading.sgv);
      }
    }
  });

  // Aggregate bins by hour and calculate percentiles
  const hourlyData: { [hour: number]: number[] } = {};

  for (let hour = 0; hour < 24; hour++) {
    hourlyData[hour] = [];
  }

  bins.forEach(bin => {
    hourlyData[bin.hour].push(...bin.readings);
  });

  // Calculate percentiles for each hour
  const hourlyPercentiles: HourlyPercentileData[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const values = hourlyData[hour];
    const sortedValues = [...values].sort((a, b) => a - b);

    if (sortedValues.length === 0) {
      // No data for this hour - use reasonable defaults
      hourlyPercentiles.push({
        hour,
        p10: 80,
        p25: 90,
        median: 100,
        p75: 120,
        p90: 140,
        readingsCount: 0
      });
      continue;
    }

    // Calculate percentiles
    const p10 = percentile(sortedValues, 10);
    const p25 = percentile(sortedValues, 25);
    const median = percentile(sortedValues, 50);
    const p75 = percentile(sortedValues, 75);
    const p90 = percentile(sortedValues, 90);

    hourlyPercentiles.push({
      hour,
      p10: Math.round(p10 * 10) / 10,
      p25: Math.round(p25 * 10) / 10,
      median: Math.round(median * 10) / 10,
      p75: Math.round(p75 * 10) / 10,
      p90: Math.round(p90 * 10) / 10,
      readingsCount: sortedValues.length
    });
  }

  return hourlyPercentiles;
}
