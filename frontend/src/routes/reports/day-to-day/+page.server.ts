import type { PageServerLoad } from "./$types";
import { apiGet } from "$lib/api";
import type { SGVEntry, TimeInRanges } from "$lib/types/nightscout";

interface DayToDayData {
  date: string;
  averageGlucose: number;
  minGlucose: number;
  maxGlucose: number;
  stdDev: number;
  timeInRanges: TimeInRanges;
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
    bolusCount: number;
    basalEvents: number;
    mealEvents: number;
  };
}

/** Calculate time in ranges from glucose readings */
function calculateTimeInRanges(readings: SGVEntry[]): TimeInRanges {
  if (readings.length === 0) {
    return {
      veryLow: 0,
      low: 0,
      target: 0,
      tightTimeInRange: 0,
      high: 0,
      veryHigh: 0,
    };
  }

  const counts = {
    veryLow: 0, // <54 mg/dL
    low: 0, // 54-69 mg/dL
    target: 0, // 70-180 mg/dL
    tightTimeInRange: 0, // 70-140 mg/dL (tight range)
    high: 0, // 181-250 mg/dL
    veryHigh: 0, // >250 mg/dL
  };

  readings.forEach((reading) => {
    const glucose = reading.sgv;
    if (glucose < 54) counts.veryLow++;
    else if (glucose <= 69) counts.low++;
    else if (glucose <= 180) counts.target++;
    else if (glucose <= 250) counts.high++;
    else counts.veryHigh++;

    // Calculate tight time in range (70-140 mg/dL)
    if (glucose >= 70 && glucose <= 140) {
      counts.tightTimeInRange++;
    }
  });

  const total = readings.length;
  return {
    veryLow: Math.round((counts.veryLow / total) * 100),
    low: Math.round((counts.low / total) * 100),
    target: Math.round((counts.target / total) * 100),
    tightTimeInRange: Math.round((counts.tightTimeInRange / total) * 100),
    high: Math.round((counts.high / total) * 100),
    veryHigh: Math.round((counts.veryHigh / total) * 100),
  };
}

/** Calculate average glucose from readings */
function calculateAverageGlucose(readings: SGVEntry[]): number {
  if (readings.length === 0) return 0;
  const sum = readings.reduce((total, reading) => total + reading.sgv, 0);
  return Math.round(sum / readings.length);
}

/** Calculate standard deviation of glucose readings */
function calculateStandardDeviation(readings: SGVEntry[]): number {
  if (readings.length === 0) return 0;

  const avg = calculateAverageGlucose(readings);
  const squaredDiffs = readings.map((reading) =>
    Math.pow(reading.sgv - avg, 2)
  );
  const avgSquaredDiff =
    squaredDiffs.reduce((sum, diff) => sum + diff, 0) / readings.length;
  return Math.round(Math.sqrt(avgSquaredDiff));
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
      stdDev: 0,
      timeInRanges: {
        veryLow: 0,
        low: 0,
        target: 0,
        tightTimeInRange: 0,
        high: 0,
        veryHigh: 0,
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
  console.log("Sample treatments:", treatments.slice(0, 3));

  const treatmentSummary = {
    totalInsulin: treatments.reduce((sum, t) => sum + (t.insulin || 0), 0),
    totalCarbs: treatments.reduce((sum, t) => sum + (t.carbs || 0), 0),
    totalProtein: treatments.reduce((sum, t) => sum + (t.protein || 0), 0),
    totalFat: treatments.reduce((sum, t) => sum + (t.fat || 0), 0),
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

  console.log("Treatment summary:", treatmentSummary);
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
    treatmentSummary,
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
