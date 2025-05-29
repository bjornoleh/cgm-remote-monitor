import type { PageServerLoad } from "./$types";
import { apiGet } from "$lib/api";
import type {
  SGVEntry,
  TimeInRanges,
  DistributionDataPoint,
} from "$lib/types/nightscout";

/** Calculate glucose distribution from readings */
function calculateDistribution(readings: SGVEntry[]): DistributionDataPoint[] {
  if (readings.length === 0) {
    return [];
  }

  // Define distribution bins (mg/dL)
  const bins = [
    { range: "<40", min: 0, max: 39 },
    { range: "40-50", min: 40, max: 50 },
    { range: "50-60", min: 51, max: 60 },
    { range: "60-70", min: 61, max: 70 },
    { range: "70-80", min: 71, max: 80 },
    { range: "80-90", min: 81, max: 90 },
    { range: "90-100", min: 91, max: 100 },
    { range: "100-110", min: 101, max: 110 },
    { range: "110-120", min: 111, max: 120 },
    { range: "120-130", min: 121, max: 130 },
    { range: "130-140", min: 131, max: 140 },
    { range: "140-150", min: 141, max: 150 },
    { range: "150-180", min: 151, max: 180 },
    { range: "180-250", min: 181, max: 250 },
    { range: "250-300", min: 251, max: 300 },
    { range: ">300", min: 301, max: 9999 },
  ];

  // Count readings in each bin
  const counts = bins.map((bin) => ({
    range: bin.range,
    count: readings.filter(
      (reading) => reading.sgv >= bin.min && reading.sgv <= bin.max
    ).length,
    percent: 0,
  }));

  // Calculate percentages
  const total = readings.length;
  counts.forEach((bin) => {
    bin.percent =
      total > 0 ? Math.round((bin.count / total) * 100 * 10) / 10 : 0;
  });

  // Filter out empty bins
  return counts.filter((bin) => bin.count > 0);
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

export const load: PageServerLoad = async ({ fetch, url }) => {
  const fetchData = async () => {
    try {
      // Get date range from URL parameters, default to last 7 days
      const daysParam = url.searchParams.get("days");
      const days = daysParam ? parseInt(daysParam) : 7;

      // Calculate date range
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Validate parameters
      if (days < 1 || days > 90) {
        throw new Error("Days parameter must be between 1 and 90");
      }

      // Fetch SGV data for the date range
      const response = await apiGet<SGVEntry[]>(fetch, "/api/v1/entries.json", {
        params: {
          "find[type]": "sgv",
          "find[date][$gte]": startDate.getTime().toString(),
          "find[date][$lte]": endDate.getTime().toString(),
          count: "10000", // Fetch more data for longer periods
        },
      });

      if (!response.success) {
        console.error("Failed to fetch SGV data:", response.error);
        return {
          reportName: "Glucose Distribution Report",
          generatedDate: new Date().toLocaleDateString(),
          distributionData: [],
          summaryMetrics: {
            totalReadings: 0,
            percentVeryLow: 0,
            percentLow: 0,
            percentTarget: 0,
            percentHigh: 0,
            percentVeryHigh: 0,
          },
          tirForPieChart: {
            veryLow: 0,
            low: 0,
            target: 0,
            high: 0,
            veryHigh: 0,
          },
          tirColors: {
            veryLow: "var(--very-low-bg)",
            low: "var(--low-bg)",
            target: "var(--target-bg)",
            high: "var(--high-bg)",
            veryHigh: "var(--very-high-bg)",
          },
          error: "Failed to fetch glucose data from the backend",
          dateRange: {
            start: startDate.toLocaleDateString(),
            end: endDate.toLocaleDateString(),
            days,
          },
        };
      }

      const readings = response.data || [];

      // Debug: Log sample data structure
      if (readings.length > 0) {
        console.log("Sample SGV entry:", readings[0]);
        console.log("Total readings for distribution:", readings.length);
        console.log(
          "Date range:",
          startDate.toLocaleDateString(),
          "to",
          endDate.toLocaleDateString()
        );
      }

      // Calculate distribution and metrics
      const distributionData = calculateDistribution(readings);
      const timeInRanges = calculateTimeInRanges(readings);

      // Calculate summary metrics from actual data
      const summaryMetrics = {
        totalReadings: readings.length,
        percentVeryLow: timeInRanges.veryLow,
        percentLow: timeInRanges.low,
        percentTarget: timeInRanges.target,
        percentHigh: timeInRanges.high,
        percentVeryHigh: timeInRanges.veryHigh,
      };

      // Use actual time in ranges data for pie chart
      const tirForPieChart = {
        veryLow: timeInRanges.veryLow,
        low: timeInRanges.low,
        target: timeInRanges.target,
        high: timeInRanges.high,
        veryHigh: timeInRanges.veryHigh,
      };

      return {
        reportName: "Glucose Distribution Report",
        generatedDate: new Date().toLocaleDateString(),
        dateRange: {
          start: startDate.toLocaleDateString(),
          end: endDate.toLocaleDateString(),
          days,
        },
        distributionData,
        summaryMetrics,
        tirForPieChart,
        tirColors: {
          veryLow: "var(--very-low-bg)",
          low: "var(--low-bg)",
          target: "var(--target-bg)",
          high: "var(--high-bg)",
          veryHigh: "var(--very-high-bg)",
        },
        totalReadings: readings.length,
      };
    } catch (error) {
      console.error("Error fetching distribution data:", error);

      return {
        reportName: "Glucose Distribution Report",
        generatedDate: new Date().toLocaleDateString(),
        dateRange: {
          start: new Date().toLocaleDateString(),
          end: new Date().toLocaleDateString(),
          days: 7,
        },
        distributionData: [],
        summaryMetrics: {
          totalReadings: 0,
          percentVeryLow: 0,
          percentLow: 0,
          percentTarget: 0,
          percentHigh: 0,
          percentVeryHigh: 0,
        },
        tirForPieChart: {
          veryLow: 0,
          low: 0,
          target: 0,
          high: 0,
          veryHigh: 0,
        },
        tirColors: {
          veryLow: "var(--very-low-bg)",
          low: "var(--low-bg)",
          target: "var(--target-bg)",
          high: "var(--high-bg)",
          veryHigh: "var(--very-high-bg)",
        },
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        totalReadings: 0,
      };
    }
  };

  const data = await fetchData();
  return {
    distributionReport: data,
  };
};
