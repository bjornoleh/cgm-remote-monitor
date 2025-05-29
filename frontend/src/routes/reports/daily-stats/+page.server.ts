import type { PageServerLoad } from "./$types";
import { apiGet } from "$lib/api";
import type { SGVEntry, TimeInRanges } from "$lib/types/nightscout";

interface DayStats {
  date: Date;
  averageGlucose: number;
  timeInRanges: TimeInRanges;
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
  // Debug: Log some sample readings
  console.log(
    "Sample glucose readings:",
    readings.slice(0, 10).map((r) => r.sgv)
  );
  console.log("Total readings:", readings.length);

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

  // Debug: Log counts
  console.log("TIR counts:", counts);

  const total = readings.length;
  const result = {
    veryLow: Math.round((counts.veryLow / total) * 100),
    low: Math.round((counts.low / total) * 100),
    target: Math.round((counts.target / total) * 100),
    tightTimeInRange: Math.round((counts.tightTimeInRange / total) * 100),
    high: Math.round((counts.high / total) * 100),
    veryHigh: Math.round((counts.veryHigh / total) * 100),
  };

  // Debug: Log final percentages
  console.log("TIR percentages:", result);
  console.log(
    "TIR sum:",
    Object.values(result).reduce((a, b) => a + b, 0)
  );

  return result;
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

/**
 * Calculate estimated A1C from average glucose Using the formula: A1C =
 * (average glucose + 46.7) / 28.7
 */
function calculateEstimatedA1C(averageGlucose: number): string {
  if (averageGlucose === 0) return "0.0";
  const a1c = (averageGlucose + 46.7) / 28.7;
  return a1c.toFixed(1);
}

/**
 * Calculate MAGE (Mean Amplitude of Glycemic Excursions) Simplified calculation
 * - average of glucose excursions > 1 SD
 */
function calculateMAGE(readings: SGVEntry[]): string {
  if (readings.length < 2) return "0.0";

  const stdDev = calculateStandardDeviation(readings);
  let excursions: number[] = [];
  for (let i = 1; i < readings.length; i++) {
    const diff = Math.abs(readings[i].sgv - readings[i - 1].sgv);
    if (diff > stdDev) {
      excursions.push(diff);
    }
  }

  if (excursions.length === 0) return "0.0";
  const mage =
    excursions.reduce((sum, exc) => sum + exc, 0) / excursions.length;
  return mage.toFixed(1);
}

/** Count high/low events (consecutive readings outside range) */
function countGlycemicEvents(readings: SGVEntry[]): {
  highEvents: number;
  lowEvents: number;
} {
  let highEvents = 0;
  let lowEvents = 0;
  let inHighEvent = false;
  let inLowEvent = false;
  readings.forEach((reading) => {
    const glucose = reading.sgv;

    // High events (>180 mg/dL)
    if (glucose > 180) {
      if (!inHighEvent) {
        highEvents++;
        inHighEvent = true;
      }
    } else {
      inHighEvent = false;
    }

    // Low events (<70 mg/dL)
    if (glucose < 70) {
      if (!inLowEvent) {
        lowEvents++;
        inLowEvent = true;
      }
    } else {
      inLowEvent = false;
    }
  });

  return { highEvents, lowEvents };
}

/** Process daily statistics from SGV data for a specific day */
async function processDayStats(
  fetch: typeof globalThis.fetch,
  date: Date
): Promise<DayStats> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const response = await apiGet<SGVEntry[]>(fetch, "/api/v1/entries.json", {
    params: {
      "find[type]": "sgv",
      "find[date][$gte]": startOfDay.getTime().toString(),
      "find[date][$lte]": endOfDay.getTime().toString(),
      count: "1000",
    },
  });

  if (!response.success || !response.data) {
    // Return default values if no data
    return {
      date,
      averageGlucose: 0,
      timeInRanges: {
        veryLow: 0,
        low: 0,
        target: 0,
        tightTimeInRange: 0,
        high: 0,
        veryHigh: 0,
      },
    };
  }

  const readings = response.data;
  return {
    date,
    averageGlucose: calculateAverageGlucose(readings),
    timeInRanges: calculateTimeInRanges(readings),
  };
}

export const load: PageServerLoad = async ({ fetch, url }) => {
  const fetchData = async () => {
    try {
      // Get date from URL parameter, default to today
      const dateParam = url.searchParams.get("date");
      const targetDate = dateParam ? new Date(dateParam) : new Date();

      // Validate date
      if (isNaN(targetDate.getTime())) {
        throw new Error("Invalid date parameter provided");
      }

      // Get start and end of the target day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch SGV data for the target day
      const response = await apiGet<SGVEntry[]>(fetch, "/api/v1/entries.json", {
        params: {
          "find[type]": "sgv",
          "find[date][$gte]": startOfDay.getTime().toString(),
          "find[date][$lte]": endOfDay.getTime().toString(),
          count: "1000",
        },
      });

      if (!response.success) {
        console.error("Failed to fetch SGV data:", response.error);
        return {
          reportName: "Daily Statistics Report",
          generatedDate: new Date().toLocaleDateString(),
          stats: null,
          error: "Failed to fetch glucose data from the backend",
        };
      }
      const readings = response.data || [];
      // Debug: Log sample data structure
      if (readings.length > 0) {
        console.log("Sample SGV entry:", readings[0]);
        console.log(
          "First 5 glucose values:",
          readings
            .slice(0, 5)
            .map((r) => ({ sgv: r.sgv, type: r.type, date: new Date(r.mills) }))
        );
      }

      // Calculate statistics
      const averageGlucose = calculateAverageGlucose(readings);
      const timeInRanges = calculateTimeInRanges(readings);
      const stdDev = calculateStandardDeviation(readings);
      const estimatedA1c = calculateEstimatedA1C(averageGlucose);
      const mage = calculateMAGE(readings);
      const { highEvents, lowEvents } = countGlycemicEvents(readings);

      // Calculate CGM active percentage (assume 5-minute intervals, 288 readings per day)
      const expectedReadings = 288;
      const cgmActivePercent = Math.round(
        (readings.length / expectedReadings) * 100
      );

      // Get recent days stats (last 6 days before target date)
      const recentDaysStats: DayStats[] = [];
      for (let i = 1; i <= 6; i++) {
        const date = new Date(targetDate);
        date.setDate(targetDate.getDate() - i);
        const dayStats = await processDayStats(fetch, date);
        recentDaysStats.push(dayStats);
      }

      const dailyStatsData = {
        date: targetDate.toISOString().split("T")[0],
        timeInRangePercent: timeInRanges.target,
        averageGlucose,
        stdDev,
        MAGE: mage,
        highEvents,
        lowEvents,
        cgmActivePercent: Math.min(100, cgmActivePercent), // Cap at 100%
        estimatedA1c,
        timeInRanges,
        tirColors: {
          veryLow: "var(--very-low-bg)",
          low: "var(--low-bg)",
          target: "var(--target-bg)",
          high: "var(--high-bg)",
          veryHigh: "var(--very-high-bg)",
        },
        recentDaysStats,
      };

      return {
        reportName: "Daily Statistics Report",
        generatedDate: new Date().toLocaleDateString(),
        dateRange: {
          target: targetDate.toLocaleDateString(),
        },
        stats: dailyStatsData,
        totalReadings: readings.length,
      };
    } catch (error) {
      console.error("Error fetching daily stats data:", error);

      return {
        reportName: "Daily Statistics Report",
        generatedDate: new Date().toLocaleDateString(),
        stats: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  };

  const data = await fetchData();
  return {
    dailyStatsReport: data,
  };
};
