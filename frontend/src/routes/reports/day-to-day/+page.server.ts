import type { PageServerLoad } from "./$types";
import { apiGet } from "$lib/api";
import type { SGVEntry } from "$lib/types/nightscout";
import { calculateBasicStats } from '$lib/utils/calculate/basic-stats';
import { calculateTimeInRange, DEFAULT_THRESHOLDS, type TimeInRangeMetrics, type AnalysisConfig } from '$lib/utils/calculate/time-in-range';
import { calculateTreatmentSummary } from '$lib/utils/calculate/treatment-stats';
import type { Entry } from '../../../app.d.ts';

interface DayToDayData {
  date: string;
  averageGlucose: number;
  minGlucose: number;
  maxGlucose: number;
  stdDev: number;
  timeInRanges: TimeInRangeMetrics;
  readingsCount: number;
  trend: "rising" | "falling" | "stable";
  glucoseData: Array<{
    timestamp: number;
    glucoseValue: number;
    date: Date;
    timeString: string;
    _id: string;
  }>;
  treatments: Array<{
    timestamp: number;
    glucoseContext: number; // For positioning on chart
    eventType: string;
    insulin?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    notes?: string;
    _id: string;
  }>;
  treatmentSummary: {
    totalInsulin: number;
    totalCarbs: number;
    totalProtein: number;
    totalFat: number;
    bolusInsulin: number;
    basalInsulin: number;
    treatmentCount: number;
    bolusCount: number;
    basalEvents: number;
    mealEvents: number;
  };
}

/**
 * Convert SGV entries to Entry format for calculation utilities
 */
function convertToEntries(readings: SGVEntry[]): Entry[] {
  return readings.map(reading => ({
    _id: reading._id,
    type: reading.type,
    sgv: reading.sgv,
    mills: reading.date,
    date: reading.date
  }));
}

/** Calculate time in ranges from glucose readings using utility functions */
function calculateTimeInRanges(readings: SGVEntry[]): TimeInRangeMetrics {
  if (readings.length === 0) {
    return {
      percentages: { severeLow: 0, low: 0, target: 0, high: 0, severeHigh: 0 },
      durations: { severeLow: 0, low: 0, target: 0, high: 0, severeHigh: 0 },
      episodes: { severeLow: 0, low: 0, high: 0, severeHigh: 0 }
    };
  }

  // Use the standardized time in range calculation
  const entries = convertToEntries(readings);
  const tirConfig: AnalysisConfig = {
    thresholds: DEFAULT_THRESHOLDS,
    sensorType: 'GENERIC_5MIN' as const
  };
  const tirMetrics = calculateTimeInRange(entries, tirConfig);

  return tirMetrics;
}

/** Calculate average glucose from readings using utility functions */
function calculateAverageGlucose(readings: SGVEntry[]): number {
  if (readings.length === 0) return 0;

  const glucoseValues = readings.map(reading => reading.sgv);
  const stats = calculateBasicStats(glucoseValues);
  return Math.round(stats.mean);
}

/** Calculate standard deviation of glucose readings using utility functions */
function calculateStandardDeviation(readings: SGVEntry[]): number {
  if (readings.length === 0) return 0;

  const glucoseValues = readings.map(reading => reading.sgv);
  const stats = calculateBasicStats(glucoseValues);
  return Math.round(stats.standardDeviation);
}

/** Determine glucose trend based on recent readings */
function calculateTrend(readings: SGVEntry[]): "rising" | "falling" | "stable" {
  if (readings.length < 3) return "stable";

  // Sort by timestamp to ensure proper order
  const sortedReadings = readings.sort((a, b) => a.mills - b.mills);
  const recent = sortedReadings.slice(-3); // Last 3 readings

  const trend1 = recent[1].sgv - recent[0].sgv;
  const trend2 = recent[2].sgv - recent[1].sgv;
  const avgTrend = (trend1 + trend2) / 2;

  if (avgTrend > 5) return "rising";
  if (avgTrend < -5) return "falling";
  return "stable";
}

/** Process day-to-day statistics for a specific day */
async function processDayData(
  fetch: typeof globalThis.fetch,
  date: Date
): Promise<DayToDayData> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch glucose data
  const sgvResponse = await apiGet<SGVEntry[]>(fetch, "/api/v1/entries.json", {
    params: {
      "find[type]": "sgv",
      "find[date][$gte]": startOfDay.getTime().toString(),
      "find[date][$lte]": endOfDay.getTime().toString(),
      count: "1000",
    },
  });
  // Fetch treatment data
  const treatmentResponse = await apiGet<
    {
      _id: string;
      date: number;
      mills: number;
      eventType: string;
      insulin?: number;
      carbs?: number;
      protein?: number;
      fat?: number;
      notes?: string;
    }[]
  >(fetch, "/api/v1/treatments.json", {
    params: {
      "find[date][$gte]": startOfDay.getTime().toString(),
      "find[date][$lte]": endOfDay.getTime().toString(),
      count: "1000",
    },
  });

  if (
    !sgvResponse.success ||
    !sgvResponse.data ||
    sgvResponse.data.length === 0
  ) {
    // Return default values if no data
    return {
      date: date.toISOString().split("T")[0], // Return just the date part (YYYY-MM-DD)
      averageGlucose: 0,
      minGlucose: 0,
      maxGlucose: 0,
      stdDev: 0,      timeInRanges: {
        percentages: { severeLow: 0, low: 0, target: 0, high: 0, severeHigh: 0 },
        durations: { severeLow: 0, low: 0, target: 0, high: 0, severeHigh: 0 },
        episodes: { severeLow: 0, low: 0, high: 0, severeHigh: 0 }
      },
      readingsCount: 0,
      trend: "stable",
      glucoseData: [],
      treatments: [],
      treatmentSummary: {
        totalInsulin: 0,
        totalCarbs: 0,
        totalProtein: 0,
        totalFat: 0,
        bolusInsulin: 0,
        basalInsulin: 0,
        treatmentCount: 0,
        bolusCount: 0,
        basalEvents: 0,
        mealEvents: 0,
      },
    };
  }

  const readings = sgvResponse.data;
  const treatments = treatmentResponse.success
    ? treatmentResponse.data || []
    : [];
  const glucoseValues = readings.map((r) => r.sgv); // Process glucose data for chart
  const glucoseData = readings.map((reading) => {
    // Use either mills or date field for timestamp
    const timestamp = reading.mills || reading.date;
    const dateObj = new Date(timestamp);
    return {
      timestamp,
      glucoseValue: reading.sgv,
      date: dateObj,
      timeString: dateObj.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      _id: reading._id,
    };
  });

  // Process treatment data for chart overlay
  const treatmentData = treatments.map((treatment) => {
    const timestamp = treatment.mills || treatment.date;
    return {
      timestamp,
      glucoseContext: 150, // Default middle glucose value for positioning
      eventType: treatment.eventType || "Unknown",
      insulin: treatment.insulin,
      carbs: treatment.carbs,
      protein: treatment.protein,
      fat: treatment.fat,
      notes: treatment.notes,
      _id: treatment._id,
    };
  });
  // Calculate treatment summary
  console.log(
    `Processing ${treatments.length} treatments for ${date.toISOString().split("T")[0]}`
  );
  console.log("Sample treatments:", treatments.slice(0, 3));  // Calculate treatment summary using utility function
  // First, convert treatments to the expected format
  const formattedTreatments = treatments.map(t => ({
    ...t,
    timestamp: (t.date || t.mills).toString()
  }));

  const treatmentSummary = calculateTreatmentSummary(formattedTreatments);
  // Add additional metrics for compatibility with existing interface
  const extendedTreatmentSummary = {
    ...treatmentSummary,
    treatmentCount: treatmentSummary.treatmentCount ||
      (treatmentSummary.bolusInsulin > 0 ? 1 : 0) +
      (treatmentSummary.totalCarbs > 0 ? 1 : 0),
    bolusCount: treatments.filter(
      (t) =>
        t.eventType &&
        (t.eventType.includes("Bolus") || (t.insulin && t.insulin > 0))
    ).length,
    basalEvents: treatments.filter(
      (t) => t.eventType && t.eventType.includes("Basal")
    ).length,
    mealEvents: treatments.filter(
      (t) =>
        t.eventType &&
        (t.eventType.includes("Meal") ||
          t.eventType.includes("Snack") ||
          (t.carbs && t.carbs > 0))
    ).length,
  };

  console.log("Treatment summary:", extendedTreatmentSummary);
  console.log("---");

  return {
    date: date.toISOString().split("T")[0], // Return just the date part (YYYY-MM-DD)
    averageGlucose: calculateAverageGlucose(readings),
    minGlucose: Math.min(...glucoseValues),
    maxGlucose: Math.max(...glucoseValues),
    stdDev: calculateStandardDeviation(readings),
    timeInRanges: calculateTimeInRanges(readings),
    readingsCount: readings.length,
    trend: calculateTrend(readings),
    glucoseData,
    treatments: treatmentData,
    treatmentSummary: extendedTreatmentSummary,
  };
}

export const load: PageServerLoad = async ({ fetch, url }) => {
  const fetchData = async () => {
    try {
      // Get date range from URL parameters, default to last 7 days
      const daysParam = url.searchParams.get("days");
      const fromParam = url.searchParams.get("from");
      const toParam = url.searchParams.get("to");

      let startDate: Date;
      let endDate: Date;

      if (fromParam && toParam) {
        startDate = new Date(fromParam);
        endDate = new Date(toParam);
      } else {
        const days = daysParam ? parseInt(daysParam) : 7;
        endDate = new Date();
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - (days - 1));
      }

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date range provided");
      }

      // Generate array of dates to process
      const dailyData: DayToDayData[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayData = await processDayData(fetch, new Date(currentDate));
        dailyData.push(dayData);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        reportName: "Day to Day Glucose Report",
        generatedDate: new Date().toLocaleDateString(),
        dateRange: {
          from: startDate.toLocaleDateString(),
          to: endDate.toLocaleDateString(),
        },
        dailyData,
        totalDays: dailyData.length,
        totalReadings: dailyData.reduce(
          (sum, day) => sum + day.readingsCount,
          0
        ),
      };
    } catch (error) {
      console.error("Error fetching day-to-day data:", error);

      return {
        reportName: "Day to Day Glucose Report",
        generatedDate: new Date().toLocaleDateString(),
        dailyData: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  };

  const data = await fetchData();
  return {
    dayTodayReport: data,
  };
};
