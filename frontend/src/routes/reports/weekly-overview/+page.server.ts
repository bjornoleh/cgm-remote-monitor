import type { PageServerLoad } from "./$types";
import type { Entry } from "../../../app.d.ts";
import { calculateBasicStats, extractGlucoseValues, type BasicGlucoseStats } from "$lib/utils/calculate/basic-stats.js";

export const load: PageServerLoad = async ({ fetch, url }) => {
  const fetchData = async () => {
    try {
      // Get date range from URL parameters
      const weeksParam = url.searchParams.get("weeks");
      const fromParam = url.searchParams.get("from");
      const toParam = url.searchParams.get("to");

      let startDate: Date;
      let endDate: Date;

      if (fromParam && toParam) {
        // Use explicit date range
        startDate = new Date(fromParam);
        endDate = new Date(toParam);
      } else {
        // Use weeks parameter or default to 4 weeks
        const weeks = weeksParam ? parseInt(weeksParam) : 4;
        endDate = new Date();
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - (weeks * 7 - 1));
      }

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date parameters provided');
      }

      // Set to full day boundaries
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      const weeklyData = await processWeeklyPercentileData(fetch, startDate, endDate);
      console.log('Weekly overview data loaded:', weeklyData);
      return {
        success: true,
        data: {
          weeklyPercentileData: weeklyData,
          dateRange: {
            from: startDate,
            to: endDate
          }
        }
      };
    } catch (error) {
      console.error('Error loading weekly overview:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  };

  return await fetchData();
};

// Process weekly percentile data
async function processWeeklyPercentileData(
  fetch: typeof globalThis.fetch,
  startDate: Date,
  endDate: Date
): Promise<(BasicGlucoseStats & { date: Date })[]> {
  // Build API query parameters using proper Nightscout API format
  const params = new URLSearchParams({
    'find[date][$gte]': startDate.getTime().toString(),
    'find[date][$lt]': endDate.getTime().toString(),
    count: '50000'
  });

  // Fetch glucose entries
  const entriesResponse = await fetch(`/api/v1/entries.json?${params}`);
  if (!entriesResponse.ok) {
    throw new Error(`Failed to fetch entries: ${entriesResponse.statusText}`);
  }
  const entries: Entry[] = await entriesResponse.json();

  // Group data by week and calculate percentiles
  const weeklyData: (BasicGlucoseStats & { date: Date })[] = [];
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  let currentWeekStart = new Date(startDate);

  while (currentWeekStart <= endDate) {
    const weekEnd = new Date(Math.min(currentWeekStart.getTime() + oneWeek - 1, endDate.getTime()));

    // Filter entries for this week
    const weekEntries = entries.filter((entry: Entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= currentWeekStart && entryDate <= weekEnd;
    });

    // Extract glucose values using the utility function
    const glucoseValues = extractGlucoseValues(weekEntries);

    if (glucoseValues.length > 0) {
      // Use calculateBasicStats to get all percentiles in one calculation
      const stats = calculateBasicStats(glucoseValues);

      weeklyData.push(Object.assign({

        ...stats,
        date: new Date(currentWeekStart)
      }));
    }

    // Move to next week
    currentWeekStart = new Date(currentWeekStart.getTime() + oneWeek);
  }

  return weeklyData;
}
