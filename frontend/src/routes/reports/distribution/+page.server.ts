import type { PageServerLoad } from './$types';
import { apiGet } from '$lib/api';
import type { Sgv, TimeInRanges } from '$lib';
import { calculateGlucoseDistribution } from '$lib/utils/calculate/glucose-distribution';
import { calculateTimeInRange, DEFAULT_THRESHOLDS, type TimeInRangeMetrics } from '$lib/utils/calculate/time-in-range';


export const load: PageServerLoad = async ({ fetch, url }) => {
  const fetchData = async () => {
    try {
      // Get date range from URL parameters, default to last 7 days
      const daysParam = url.searchParams.get('days');
      const days = daysParam ? parseInt(daysParam) : 7;

      // Calculate date range
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Validate parameters
      if (days < 1 || days > 90) {
        throw new Error('Days parameter must be between 1 and 90');
      }

      // Fetch SGV data for the date range
      const response = await apiGet<Sgv[]>(fetch, '/api/v1/entries.json', {
        params: {
          'find[type]': 'sgv',
          'find[date][$gte]': startDate.getTime().toString(),
          'find[date][$lte]': endDate.getTime().toString(),
          count: '10000' // Fetch more data for longer periods
        }
      });

      const readings = response.data || [];

      // Debug: Log sample data structure
      if (readings.length > 0) {
        console.log('Sample SGV entry:', readings[0]);
        console.log('Total readings for distribution:', readings.length);
        console.log('Date range:', startDate.toLocaleDateString(), 'to', endDate.toLocaleDateString());
      }
      const distributionData = calculateGlucoseDistribution(readings);

      // Calculate time in range using the standardized utility
      const tirConfig = {
        thresholds: DEFAULT_THRESHOLDS,
        sensorType: 'GENERIC_5MIN' // Default sensor type
      };
      const tirMetrics = calculateTimeInRange(readings, tirConfig);


      return {
        reportName: "Glucose Distribution Report",
        generatedDate: new Date().toLocaleDateString(),
        dateRange: {
          start: startDate.toLocaleDateString(),
          end: endDate.toLocaleDateString(),
          days
        },
        distributionData,
        tirMetrics,
        totalReadings: readings.length
      };

    } catch (error) {
      console.error('Error fetching distribution data:', error);
    }
  };

  return await fetchData();
};
