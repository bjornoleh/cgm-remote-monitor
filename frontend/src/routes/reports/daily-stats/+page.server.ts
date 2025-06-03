import type { PageServerLoad } from "./$types";
import { apiGet } from '$lib/api';
import type { Sgv } from '$lib';
import type { TimeInRangeMetrics } from '$lib/utils/calculate/time-in-range';
import { analyzeGlucoseData } from '$lib/utils/glucose-analytics';
import { calculateCGMActivePercent } from '$lib/utils/calculate/data-quality';

interface DayStats {
  date: Date;
  averageGlucose: number;
  timeInRanges: TimeInRangeMetrics;
  glucoseReadings: number[];
}





/**
 * Process daily statistics from SGV data for a specific day using new analytics
 */
async function processDayStats(fetch: typeof globalThis.fetch, date: Date): Promise<DayStats> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const response = await apiGet<Sgv[]>(fetch, '/api/v1/entries.json', {
    params: {
      'find[type]': 'sgv',
      'find[date][$gte]': startOfDay.getTime().toString(),
      'find[date][$lte]': endOfDay.getTime().toString(),
      count: '1000'
    }
  });
  if (!response.success || !response.data) {
    // Return default values if no data
    throw new Error(`Failed to fetch SGV data for ${date.toISOString()}: ${response.error || 'Unknown error'}`);
  }
  const readings = response.data;
  // Use new glucose analytics directly with SGV data
  const analytics = analyzeGlucoseData(readings, [], {
    thresholds: {
      severeLow: 54,
      low: 70,
      targetLow: 70,
      targetHigh: 180,
      high: 180,
      severeHigh: 250
    },
    sensorType: 'GENERIC_5MIN',
    includeLoopingMetrics: false
  });
  return {
    date,
    averageGlucose: Math.round(analytics.basicStats.mean),
    timeInRanges: analytics.timeInRange,
    glucoseReadings: readings.map(reading => reading.sgv)
  };
}

export const load: PageServerLoad = async ({ fetch, url }) => {
  const fetchData = async () => {
    try {
      // Get date range from URL parameters, similar to other reports
      const daysParam = url.searchParams.get("days");
      const fromParam = url.searchParams.get("from");
      const toParam = url.searchParams.get("to");
      const dateParam = url.searchParams.get("date"); // Legacy support

      let startDate: Date;
      let endDate: Date;

      if (fromParam && toParam) {
        // Use explicit date range
        startDate = new Date(fromParam);
        endDate = new Date(toParam);
      } else if (dateParam) {
        // Legacy single date support - treat as 1-day range
        const targetDate = new Date(dateParam);
        startDate = new Date(targetDate);
        endDate = new Date(targetDate);
      } else {
        // Use days parameter or default to 1 day (today)
        const days = daysParam ? parseInt(daysParam) : 1;
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

      // Fetch SGV data for the date range
      const response = await apiGet<Sgv[]>(fetch, '/api/v1/entries.json', {
        params: {
          'find[type]': 'sgv',
          'find[date][$gte]': startDate.getTime().toString(),
          'find[date][$lte]': endDate.getTime().toString(),
          count: '10000' // Increase count for longer date ranges
        }
      });

      if (!response.success) {
        console.error('Failed to fetch SGV data:', response.error);
        throw new Error('Failed to fetch SGV data');
      }

      const readings = response.data || [];

      // Debug: Log sample data structure
      if (readings.length > 0) {
        console.log('Sample SGV entry:', readings[0]);
        console.log('Date range:', startDate.toLocaleDateString(), 'to', endDate.toLocaleDateString());
        console.log('Total readings:', readings.length);
      }

      // Use glucose analytics for comprehensive analysis
      const analytics = analyzeGlucoseData(readings, [], {
        thresholds: {
          severeLow: 54,
          low: 70,
          targetLow: 70,
          targetHigh: 180,
          high: 180,
          severeHigh: 250
        },
        sensorType: 'GENERIC_5MIN',
        includeLoopingMetrics: false
      });
      const highEvents = analytics.timeInRange.episodes.high + analytics.timeInRange.episodes.severeHigh;
      const lowEvents = analytics.timeInRange.episodes.low + analytics.timeInRange.episodes.severeLow;
      // Calculate total days for display
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

      // Get daily breakdown for the date range (instead of hard-coded 6 days)
      const dailyStats: DayStats[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayStats = await processDayStats(fetch, new Date(currentDate));
        dailyStats.push(dayStats);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      // Use the primary date (for single day) or date range
      const primaryDate = dailyStats.length === 1 ? dailyStats[0].date : null;
      const dailyStatsData = {
        date: primaryDate ? primaryDate.toISOString().split("T")[0] : `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
        timeInRangePercent: analytics.timeInRange.percentages.target,
        averageGlucose: Math.round(analytics.basicStats.mean),
        stdDev: Math.round(analytics.basicStats.standardDeviation),
        MAGE: analytics.glycemicVariability.meanAmplitudeGlycemicExcursions.toFixed(1),
        highEvents,
        lowEvents,
        cgmActivePercent: analytics.dataQuality.cgmActivePercent,
        estimatedA1c: analytics.glycemicVariability.estimatedA1c,
        timeInRanges: analytics.timeInRange,
        recentDaysStats: dailyStats, // Renamed for clarity - contains all days in range
        glucoseReadings: readings.map(reading => reading.sgv),
        // Include full glycemic variability metrics
        glycemicVariability: analytics.glycemicVariability,
        analytics
      };

      return {
        reportName: "Daily Statistics Report",
        generatedDate: new Date().toLocaleDateString(),
        dateRange: {
          from: startDate.toLocaleDateString(),
          to: endDate.toLocaleDateString(),
          days: totalDays
        },
        analytics,
        stats: dailyStatsData,
        totalReadings: readings.length
      };
    } catch (error) {
      throw new Error(`Error generating daily stats report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  try {
    // Get server settings
    const statusResponse = await apiGet(fetch, '/api/v1/status.json');

    if (!statusResponse.success) {
      throw new Error(`Failed to fetch server settings: ${statusResponse.error || 'Unknown error'}`);
    }

    const serverSettings = statusResponse.data;

    // Fetch basic data for PageData compliance
    const [deviceStatusResponse, treatmentsResponse] = await Promise.allSettled([
      apiGet(fetch, '/api/v1/devicestatus.json', {
        params: { count: 10 },
        throwOnError: false
      }),
      apiGet(fetch, '/api/v1/treatments.json', {
        params: { count: 50 },
        throwOnError: false
      })
    ]);

    const deviceStatus = deviceStatusResponse.status === 'fulfilled' && deviceStatusResponse.value.success
      ? deviceStatusResponse.value.data || []
      : [];

    const treatments = treatmentsResponse.status === 'fulfilled' && treatmentsResponse.value.success
      ? treatmentsResponse.value.data || []
      : [];

    // Generate the daily stats report
    const data = await fetchData();

    return {
      loading: false,
      serverSettings,
      entries: [], // Daily stats doesn't need full entries array
      deviceStatus,
      treatments,
      dailyStatsReport: data
    };

  } catch (error) {
    console.error('Error in daily stats load function:', error);
    return {
      loading: false,
      error: 'An error occurred while loading the daily stats report',
      serverSettings: null,
      entries: [],
      deviceStatus: [],
      treatments: [],      dailyStatsReport: {
        reportName: 'Daily Statistics',
        generatedDate: new Date().toISOString(),
        dateRange: {
          from: new Date().toLocaleDateString(),
          to: new Date().toLocaleDateString(),
          days: 1
        },
        stats: null,
        totalReadings: 0,
        error: 'An error occurred while generating the report'
      }
    };
  }
};
