import type { PageServerLoad } from "./$types";
import { apiGet } from '$lib/api';
import type { SGVEntry } from '$lib/types/nightscout';
import type { Treatment } from '$lib/stores/client-state.svelte.ts';

// Extended treatment type for IOB calculations
interface ExtendedTreatment extends Treatment {
  absolute?: number;
  duration?: number;
}

interface HourlyStats {
  hour: number;
  readingsCount: number;
  average: number;
  min: number;
  quartile25: number;
  median: number;
  quartile75: number;
  max: number;
  standardDeviation: number;
  basalIob: number;
  tempIob: number;
  glucoseValues: number[];
}

interface HourlyBoxPlotData {
  hour: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
}

/**
 * Calculate percentile for a sorted array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const index = (p / 100) * (arr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (upper >= arr.length) return arr[arr.length - 1];
  return arr[lower] * (1 - weight) + arr[upper] * weight;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((sum, value) => sum + value, 0) / arr.length;
  const variance = arr.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Calculate IOB for treatments at a specific time
 */
function calculateIOBForTime(treatments: Treatment[], targetTime: number): { basalIob: number; tempIob: number } {
  let basalIob = 0;
  let tempIob = 0;

  // Simple IOB calculation - in reality this would use the proper IOB algorithm
  // Look for treatments within 6 hours (typical insulin duration)
  const sixHoursMs = 6 * 60 * 60 * 1000;

  treatments.forEach(treatment => {
    if (!treatment.created_at) return;

    const treatmentTime = new Date(treatment.created_at).getTime();
    const timeDiff = targetTime - treatmentTime;

    // Only consider treatments within the last 6 hours
    if (timeDiff >= 0 && timeDiff <= sixHoursMs) {
      const hoursSinceDelivery = timeDiff / (60 * 60 * 1000);

      // Simple linear decay model (actual IOB would use proper curves)
      const remainingFraction = Math.max(0, (6 - hoursSinceDelivery) / 6);      if (treatment.eventType === 'Bolus' && treatment.insulin) {
        tempIob += treatment.insulin * remainingFraction;
      } else if (treatment.eventType === 'Temp Basal') {
        const extTreatment = treatment as ExtendedTreatment;
        if (extTreatment.absolute) {
          // For temp basals, calculate additional insulin above normal basal
          const normalBasal = 1.0; // This should come from profile
          const additionalInsulin = Math.max(0, extTreatment.absolute - normalBasal);
          const duration = extTreatment.duration || 30; // minutes
          const totalAdditional = (additionalInsulin * duration) / 60;
          tempIob += totalAdditional * remainingFraction;
        }
      }
    }
  });

  // Add baseline basal IOB (simplified)
  basalIob = 1.0; // This should be calculated from actual basal profile

  return { basalIob, tempIob };
}

/**
 * Process hourly statistics from SGV data
 */
async function processHourlyStats(
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

    // Calculate outliers for box plot (values beyond 1.5 * IQR)
    const iqr = quartile75 - quartile25;
    const lowerBound = quartile25 - 1.5 * iqr;
    const upperBound = quartile75 + 1.5 * iqr;
    const outliers = sortedValues.filter(val => val < lowerBound || val > upperBound);

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

export const load: PageServerLoad = async ({ fetch, url }) => {
  const fetchData = async () => {
    try {
      // Get date range from URL parameters
      const daysParam = url.searchParams.get("days");
      const fromParam = url.searchParams.get("from");
      const toParam = url.searchParams.get("to");

      let startDate: Date;
      let endDate: Date;

      if (fromParam && toParam) {
        // Use explicit date range
        startDate = new Date(fromParam);
        endDate = new Date(toParam);
      } else {
        // Use days parameter or default to 14 days
        const days = daysParam ? parseInt(daysParam) : 14;
        endDate = new Date();
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - (days - 1));
      }

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date parameters provided');
      }

      // Set to full day boundaries
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      const { hourlyStats, boxPlotData } = await processHourlyStats(fetch, startDate, endDate);

      return {
        success: true,
        data: {
          hourlyStats,
          boxPlotData,
          dateRange: {
            from: startDate,
            to: endDate
          }
        }
      };
    } catch (error) {
      console.error('Error loading hourly stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: {
          hourlyStats: [],
          boxPlotData: [],
          dateRange: {
            from: new Date(),
            to: new Date()
          }
        }
      };
    }
  };

  return await fetchData();
};
