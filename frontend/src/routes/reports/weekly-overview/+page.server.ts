import type { PageServerLoad } from "./$types";

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
) {
  // Build API query parameters
  const params = new URLSearchParams({
    find: JSON.stringify({
      dateString: {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0]
      }
    }),
    count: '50000'
  });

  // Fetch glucose entries
  const entriesResponse = await fetch(`/api/v1/entries.json?${params}`);
  if (!entriesResponse.ok) {
    throw new Error(`Failed to fetch entries: ${entriesResponse.statusText}`);
  }

  const entries = await entriesResponse.json();
  
  // Group data by week and calculate percentiles
  const weeklyData = [];
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  
  let currentWeekStart = new Date(startDate);
  
  while (currentWeekStart <= endDate) {
    const weekEnd = new Date(Math.min(currentWeekStart.getTime() + oneWeek - 1, endDate.getTime()));
    
    // Filter entries for this week
    const weekEntries = entries.filter((entry: any) => {
      const entryDate = new Date(entry.dateString);
      return entryDate >= currentWeekStart && entryDate <= weekEnd;
    });
    
    // Extract glucose values
    const glucoseValues = weekEntries
      .map((entry: any) => entry.sgv)
      .filter((sgv: number) => sgv && sgv > 0)
      .sort((a: number, b: number) => a - b);
    
    if (glucoseValues.length > 0) {
      // Calculate percentiles
      const percentiles = calculatePercentiles(glucoseValues);
      
      weeklyData.push({
        date: new Date(currentWeekStart),
        low: percentiles.p10,
        p25: percentiles.p25,
        median: percentiles.p50,
        p75: percentiles.p75,
        high: percentiles.p90
      });
    }
    
    // Move to next week
    currentWeekStart = new Date(currentWeekStart.getTime() + oneWeek);
  }
  
  return weeklyData;
}

// Calculate percentiles from sorted array
function calculatePercentiles(sortedValues: number[]) {
  const getPercentile = (p: number) => {
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sortedValues.length) return sortedValues[sortedValues.length - 1];
    if (lower < 0) return sortedValues[0];
    
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  };
  
  return {
    p10: getPercentile(10),
    p25: getPercentile(25),
    p50: getPercentile(50), // median
    p75: getPercentile(75),
    p90: getPercentile(90)
  };
}
