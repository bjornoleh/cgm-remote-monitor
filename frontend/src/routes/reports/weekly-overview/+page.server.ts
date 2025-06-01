import type { PageServerLoad } from "./$types";
import { processHourlyStats } from "$lib/calculations/hourly-stats.js";
import { apiGet } from "$lib/api.js";
import { analyzeGlucoseData, DEFAULT_THRESHOLDS } from "$lib/utils/glucose-analytics.js";
import type { SGVEntry } from "$lib/types/nightscout.js";
import type { Entry } from "$lib/app.d.ts";

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

      // Process hourly statistics for the date range
      const { hourlyStats } = await processHourlyStats(fetch, startDate, endDate);

      // Fetch SGV data for proper TIR calculations
      const sgvResponse = await apiGet<SGVEntry[]>(fetch, '/api/v1/entries.json', {
        params: {
          'find[type]': 'sgv',
          'find[date][$gte]': startDate.getTime().toString(),
          'find[date][$lte]': endDate.getTime().toString(),
          count: '10000'
        }
      });

      let tirMetrics = null;
      let glucoseMetrics = null;

      if (sgvResponse.success && sgvResponse.data && sgvResponse.data.length > 0) {
        // Convert SGV entries to Entry format for analytics
        const entries: Entry[] = sgvResponse.data.map(reading => ({
          _id: reading._id,
          type: reading.type,
          sgv: reading.sgv,
          mills: reading.mills || reading.date,
          date: reading.date || reading.mills,
          direction: reading.direction,
          dateString: reading.dateString
        }));

        // Use proper glucose analytics for TIR calculation
        const analytics = analyzeGlucoseData(entries, [], {
          thresholds: DEFAULT_THRESHOLDS,
          sensorType: 'GENERIC_5MIN',
          includeLoopingMetrics: false,
          units: 'mg/dl'
        });

        tirMetrics = analytics.timeInRange;
        glucoseMetrics = {
          totalReadings: analytics.basicStats.count,
          averageGlucose: Math.round(analytics.basicStats.mean),
          standardDeviation: Math.round(analytics.basicStats.standardDeviation),
          percentiles: analytics.basicStats.percentiles
        };        console.log('TIR Analytics calculated:', {
          timeInRange: tirMetrics.percentages.target,
          tightTimeInRange: tirMetrics.percentages.tightTarget,
          totalReadings: glucoseMetrics.totalReadings,
          averageGlucose: glucoseMetrics.averageGlucose
        });
      }

      console.log('Hourly percentile data loaded:', hourlyStats.length, 'hours');
      return {
        success: true,
        data: {
          hourlyStats,
          tirMetrics,
          glucoseMetrics,
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


