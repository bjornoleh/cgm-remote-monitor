import type { PageServerLoad } from "./$types";
import { apiGet } from "$lib/api";
import type { SGVEntry } from "$lib/types/nightscout";
import { calculateBasicStats } from '$lib/utils/calculate/basic-stats';
import { calculateTimeInRange, DEFAULT_THRESHOLDS, type TimeInRangeMetrics, type AnalysisConfig } from '$lib/utils/calculate/time-in-range';
import type { Entry } from '../../../app.d.ts';

interface HourlyStats {
  hourLabel: string;
  averageGlucose: number;
  medianGlucose: number;
  stdDev: number;
  timeInRanges: TimeInRangeMetrics;
}

/**
 * Convert SGV entries to Entry format for calculation utilities
 */
function convertToEntries(readings: SGVEntry[]): Entry[] {
  return readings.map(reading => ({
    _id: reading._id,
    sgv: reading.sgv,
    date: reading.date,
    mills: reading.mills,
    type: reading.type,
    direction: reading.direction
  }));
}

/**
 * Calculate hourly statistics from glucose readings
 */
function calculateHourlyStats(readings: SGVEntry[]): HourlyStats[] {
  // Group readings by hour
  const groupedByHour: Record<string, SGVEntry[]> = {};
  for (let i = 0; i < 24; i++) {
    groupedByHour[i.toString().padStart(2, "0")] = [];
  }

  readings.forEach((reading) => {
    // Ensure sgv is within a reasonable range for CGM data
    if (reading.sgv >= 39 && reading.sgv <= 600) {
      const hour = new Date(reading.date).getHours().toString().padStart(2, "0");
      if (groupedByHour[hour]) {
        groupedByHour[hour].push(reading);
      }
    }
  });

  const hourlyDataPoints: HourlyStats[] = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    const hourLabel = hour + ":00";
    const hourReadings = groupedByHour[hour] || [];    if (hourReadings.length === 0) {
      // Return empty stats for hours with no data
      return {
        hourLabel,
        averageGlucose: 0,
        medianGlucose: 0,
        stdDev: 0,
        timeInRanges: {
          percentages: { severeLow: 0, low: 0, target: 0, high: 0, severeHigh: 0 },
          durations: { severeLow: 0, low: 0, target: 0, high: 0, severeHigh: 0 },
          episodes: { severeLow: 0, low: 0, high: 0, severeHigh: 0 },
        },
      };
    }

    // Calculate basic statistics using utility functions
    const glucoseValues = hourReadings.map(reading => reading.sgv);
    const basicStats = calculateBasicStats(glucoseValues);

    // Calculate time in ranges using utility functions
    const entries = convertToEntries(hourReadings);
    const tirConfig: AnalysisConfig = {
      thresholds: DEFAULT_THRESHOLDS,
      sensorType: 'GENERIC_5MIN' as const
    };
    const tirMetrics = calculateTimeInRange(entries, tirConfig);

    return {
      hourLabel,
      averageGlucose: Math.round(basicStats.mean),
      medianGlucose: Math.round(basicStats.median),
      stdDev: Math.round(basicStats.standardDeviation),
      timeInRanges: tirMetrics,
    };
  });

  return hourlyDataPoints;
}



export const load: PageServerLoad = async ({ fetch, url }) => {
  const fetchData = async () => {
    try {      // Get date range parameters from URL or use defaults
      const { searchParams } = url;
      const daysBack = parseInt(searchParams.get("days") || "30");
      const now = new Date();
      const endDate = new Date(now.getTime());
      const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

      // Fetch glucose entries from Nightscout API
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();

      const entriesResponse = await apiGet<SGVEntry[]>(
        fetch,
        "/api/v1/entries.json",
        {
          params: {
            "find[date][$gte]": startTime.toString(),
            "find[date][$lte]": endTime.toString(),
            "find[type]": "sgv",
            count: "10000", // Get a large number to ensure we have all data
          },
          throwOnError: false,        }
      );

      if (!entriesResponse.success || !entriesResponse.data) {
        console.error("Failed to fetch glucose entries:", entriesResponse.error);
        throw new Error("Failed to fetch glucose data");
      }

      const readings = entriesResponse.data;
      console.log(`Fetched ${readings.length} glucose readings for hourly stats`);

      // Calculate hourly statistics using the calculation utilities
      const hourlyDataPoints = calculateHourlyStats(readings);

      // Calculate average daily TIR from hourly metrics
      const avgDailyTIR = {
        severeLow: 0,
        low: 0,
        target: 0,
        high: 0,
        severeHigh: 0,
      };

      if (hourlyDataPoints.length > 0) {
        for (const hourStat of hourlyDataPoints) {
          avgDailyTIR.severeLow += hourStat.timeInRanges.percentages.severeLow;
          avgDailyTIR.low += hourStat.timeInRanges.percentages.low;
          avgDailyTIR.target += hourStat.timeInRanges.percentages.target;
          avgDailyTIR.high += hourStat.timeInRanges.percentages.high;
          avgDailyTIR.severeHigh += hourStat.timeInRanges.percentages.severeHigh;
        }
        const numHours = hourlyDataPoints.length;
        avgDailyTIR.severeLow = Math.round(avgDailyTIR.severeLow / numHours);
        avgDailyTIR.low = Math.round(avgDailyTIR.low / numHours);
        avgDailyTIR.target = Math.round(avgDailyTIR.target / numHours);
        avgDailyTIR.high = Math.round(avgDailyTIR.high / numHours);
        avgDailyTIR.severeHigh = Math.round(avgDailyTIR.severeHigh / numHours);

        // Normalize to ensure sum is 100%
        const tirSum = avgDailyTIR.severeLow + avgDailyTIR.low + avgDailyTIR.target + avgDailyTIR.high + avgDailyTIR.severeHigh;
        if (tirSum > 0) {
          const scale = 100 / tirSum;
          avgDailyTIR.severeLow = Math.round(avgDailyTIR.severeLow * scale);
          avgDailyTIR.low = Math.round(avgDailyTIR.low * scale);
          avgDailyTIR.high = Math.round(avgDailyTIR.high * scale);
          avgDailyTIR.severeHigh = Math.round(avgDailyTIR.severeHigh * scale);
          // Adjust target to ensure sum is 100
          avgDailyTIR.target = 100 - avgDailyTIR.severeLow - avgDailyTIR.low - avgDailyTIR.high - avgDailyTIR.severeHigh;
        }
      }

      return {
        reportName: "Hourly Statistics Report",
        generatedDate: new Date().toLocaleDateString(),
        hourlyStats: hourlyDataPoints,
        averageDailyTIR: avgDailyTIR
      };} catch (error) {
      console.error("Error in fetchData:", error);
      throw error;
    }
  };

  return await fetchData()
};
