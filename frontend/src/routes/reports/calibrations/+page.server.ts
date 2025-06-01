import type { PageServerLoad } from './$types';
import { apiGet } from '$lib/api';
import type { CalibrationEntry, MBGEntry, SGVEntry } from '$lib';

interface CalibrationEvent {
  id: string;
  timestamp: string;
  meterBg: number;
  sensorBgBefore: number;
  sensorBgAfter: number;
  slope: string;
  intercept: string;
  scale: string;
}

export const load: PageServerLoad = async ({ fetch, url }) => {
  const fetchData = async () => {
    try {
      // Get date range from URL parameters
      const fromParam = url.searchParams.get('from');
      const toParam = url.searchParams.get('to');

      // Default to last 30 days if no parameters provided
      const defaultTo = Date.now();
      const defaultFrom = defaultTo - (30 * 24 * 60 * 60 * 1000);

      const fromDate = fromParam ? new Date(fromParam).getTime() : defaultFrom;
      const toDate = toParam ? new Date(toParam).getTime() : defaultTo;

      // Validate dates
      if (isNaN(fromDate) || isNaN(toDate)) {
        throw new Error('Invalid date parameters provided');
      }

      if (fromDate >= toDate) {
        throw new Error('From date must be before to date');
      }
        // Get calibration data
      const calResponse = await apiGet<CalibrationEntry[]>(fetch, '/api/v1/entries.json', {
        params: {
          'find[type]': 'cal',
          'find[date][$gte]': fromDate.toString(),
          'find[date][$lte]': toDate.toString(),
          count: '100'
        }
      });

      // Get MBG (meter blood glucose) data
      const mbgResponse = await apiGet<MBGEntry[]>(fetch, '/api/v1/entries.json', {
        params: {
          'find[type]': 'mbg',
          'find[date][$gte]': fromDate.toString(),
          'find[date][$lte]': toDate.toString(),
          count: '100'
        }
      });

      // Get SGV data to correlate with calibrations
      const sgvResponse = await apiGet<SGVEntry[]>(fetch, '/api/v1/entries.json', {
        params: {
          'find[type]': 'sgv',
          'find[date][$gte]': fromDate.toString(),
          'find[date][$lte]': toDate.toString(),
          count: '1000'
        }
      });

      if (!calResponse.success || !mbgResponse.success || !sgvResponse.success) {
        console.error('Failed to fetch data:', {
          cal: calResponse.error,
          mbg: mbgResponse.error,
          sgv: sgvResponse.error
        });

        return {
          reportName: "Calibrations Report",
          generatedDate: new Date().toLocaleDateString(),
          calibrations: [],
          error: "Failed to fetch calibration data from the backend"
        };
      }

      const calibrations = calResponse.data || [];
      const mbgs = mbgResponse.data || [];
      const sgvs = sgvResponse.data || [];

      // Create a map of MBG entries by timestamp for quick lookup
      const mbgMap = new Map<number, MBGEntry>();
      mbgs.forEach(mbg => {
        mbgMap.set(mbg.mills, mbg);
      });

      // Helper function to find nearest SGV reading
      const findNearestSGV = (timestamp: number, maxDiffMs = 5 * 60 * 1000): SGVEntry | null => {
        let nearest: SGVEntry | null = null;
        let minDiff = Infinity;

        for (const sgv of sgvs) {
          const diff = Math.abs(sgv.mills - timestamp);
          if (diff < minDiff && diff <= maxDiffMs) {
            minDiff = diff;
            nearest = sgv;
          }
        }

        return nearest;
      };

      // Process calibration events
      const calibrationEvents: CalibrationEvent[] = [];

      // Group calibrations with nearby MBG readings
      for (const cal of calibrations) {
        // Look for MBG readings within 10 minutes of calibration
        const timeTolerance = 10 * 60 * 1000; // 10 minutes in milliseconds
        let associatedMBG: MBGEntry | null = null;

        // Find the closest MBG reading to this calibration
        for (const mbg of mbgs) {
          const timeDiff = Math.abs(mbg.mills - cal.mills);
          if (timeDiff <= timeTolerance) {
            if (!associatedMBG || Math.abs(associatedMBG.mills - cal.mills) > timeDiff) {
              associatedMBG = mbg;
            }
          }
        }        if (associatedMBG) {
          // Find sensor readings before and after calibration
          const beforeSGV = findNearestSGV(cal.mills - (2 * 60 * 1000)); // 2 minutes before
          const afterSGV = findNearestSGV(cal.mills + (2 * 60 * 1000));  // 2 minutes after

          calibrationEvents.push({
            id: cal._id,
            timestamp: new Date(cal.mills).toISOString(),
            meterBg: Math.round(associatedMBG.mgdl),
            sensorBgBefore: beforeSGV ? Math.round(beforeSGV.sgv) : Math.round(associatedMBG.mgdl),
            sensorBgAfter: afterSGV ? Math.round(afterSGV.sgv) : Math.round(associatedMBG.mgdl),
            slope: cal.slope.toFixed(2),
            intercept: cal.intercept.toFixed(0),
            scale: cal.scale.toFixed(3)
          });
        }
      }// Sort by timestamp (newest first)
      calibrationEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        reportName: "Calibrations Report",
        generatedDate: new Date().toLocaleDateString(),
        dateRange: {
          from: new Date(fromDate).toLocaleDateString(),
          to: new Date(toDate).toLocaleDateString()
        },
        calibrations: calibrationEvents,
        totalCalibrations: calibrations.length,
        totalMBGs: mbgs.length
      };

    } catch (error) {
      console.error('Error fetching calibration data:', error);

      return {
        reportName: "Calibrations Report",
        generatedDate: new Date().toLocaleDateString(),
        calibrations: [],
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  };

  const data = await fetchData();
  return {
    calibrationsReport: data
  };
};
