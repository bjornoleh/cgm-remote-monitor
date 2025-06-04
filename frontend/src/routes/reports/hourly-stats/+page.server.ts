import type { PageServerLoad } from "./$types";
import { processHourlyStats } from '$lib/calculations';

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

      const { hourlyStats, boxPlotData, readings, treatments } = await processHourlyStats(fetch, startDate, endDate);

      return {
          hourlyStats,
          boxPlotData,
          readings,
          treatments,
          dateRange: {
            from: startDate,
            to: endDate
          }
      };
    } catch (error) {
      console.error('Error loading hourly stats:', error);
      throw new Error('Failed to load hourly statistics');
    }
  };

  return await fetchData();
};
