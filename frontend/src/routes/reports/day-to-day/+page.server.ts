import type { PageServerLoad } from "./$types";
import { apiGet } from "$lib/api";
import type { SGVEntry } from "$lib/types/nightscout";
import { analyzeGlucoseData, type GlucoseAnalytics } from '$lib/utils/glucose-analytics';
import { calculateTreatmentSummary, type TreatmentSummary } from '$lib/utils/calculate/treatment-stats';
import type { Entry, Treatment, SGVDirection } from '$lib';
import type { TranslationKey } from '../../../../lib/language';

interface DayToDayData {
  date: string;
  analytics: GlucoseAnalytics;
  readingsCount: number;
  trend: "rising" | "falling" | "stable";
  glucoseData: Entry[];
  treatments: Treatment[];
  treatmentSummary: TreatmentSummary;
}

/**
 * Convert SGV entries to Entry format for calculation utilities
 */
function convertToEntries(readings: SGVEntry[]): Entry[] {
  return readings.map(reading => ({
    _id: reading._id,
    type: "sgv" as const,
    sgv: reading.sgv,
    mills: reading.date,
    date: new Date(reading.date),
    mgdl: reading.sgv
  }));
}

/** Improved glucose trend calculation using recent readings */
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
    throw new Error(
      `No glucose data found for ${date.toISOString().split("T")[0]}`
    );
  }
  const readings = sgvResponse.data;
  const treatments = treatmentResponse.success
    ? treatmentResponse.data || []
    : [];

  // Process glucose data for chart
  const glucoseData: Entry[] = readings.map((reading): Entry => {
    // Use either mills or date field for timestamp
    const timestamp = reading.mills || reading.date;
    return {
      _id: reading._id,
      type: "sgv" as const,
      sgv: reading.sgv,
      direction: reading.direction as SGVDirection,
      mills: timestamp,
      date: new Date(timestamp),
      mgdl: reading.sgv,
    };
  });

  // Convert to Entry format for comprehensive analytics
  const entriesForAnalytics = convertToEntries(readings);

  // Use comprehensive glucose analytics instead of individual calculations
  const analytics = analyzeGlucoseData(entriesForAnalytics, [], {
    thresholds: {
      severeLow: 54,
      low: 70,
      targetLow: 70,
      targetHigh: 180,
      high: 180,
      severeHigh: 250
    },
    sensorType: 'GENERIC_5MIN',
    includeLoopingMetrics: false,
    units: 'mg/dl'
  });

  // Calculate treatment summary
  console.log(
    `Processing ${treatments.length} treatments for ${date.toISOString().split("T")[0]}`
  );
  console.log("Sample treatments:", treatments.slice(0, 3));

  // Convert server treatment data to the format expected by calculateTreatmentSummary
  const adaptedTreatments: Treatment[] = treatments.map(treatment => ({
    ...treatment,
    created_at: new Date(treatment.mills).toISOString(),
    mgdl: 0, // Not used in treatment summary calculations
    endmills: treatment.mills,
    profile: "", // Not used in treatment summary calculations
    targetTop: 0, // Not used in treatment summary calculations
    targetBottom: 0, // Not used in treatment summary calculations
    mills: treatment.mills,
    eventType: treatment.eventType as TranslationKey // Type assertion for compatibility
  }));

  const treatmentSummary = calculateTreatmentSummary(adaptedTreatments);
  console.log("Treatment summary:", treatmentSummary);
  console.log("---");

  return {
    date: date.toISOString().split("T")[0], // Return just the date part (YYYY-MM-DD)
    analytics,
    readingsCount: readings.length,
    trend: calculateTrend(readings),
    glucoseData,
    treatments: adaptedTreatments,
    treatmentSummary: treatmentSummary,
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
        },        dailyData,
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
