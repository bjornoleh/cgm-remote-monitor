import type { PageServerLoad } from "./$types";
import { apiGet } from '$lib/api';
import type { Treatment } from '$lib/stores/client-state.svelte.ts';

interface TreatmentReportData {
  treatments: Treatment[];
  dateRange: {
    from: Date;
    to: Date;
  };
}

export const load: PageServerLoad = async ({ fetch, url }) => {
  const fetchData = async (): Promise<{
    success: boolean;
    data: TreatmentReportData;
    error?: string;
  }> => {
    try {
      // Get date range from URL parameters
      const daysParam = url.searchParams.get("days");
      const fromParam = url.searchParams.get("from");
      const toParam = url.searchParams.get("to");
      const typeParam = url.searchParams.get("type");
      const eventTypeParam = url.searchParams.get("eventType");

      let startDate: Date;
      let endDate: Date;

      if (fromParam && toParam) {
        // Use explicit date range
        startDate = new Date(fromParam);
        endDate = new Date(toParam);
      } else {
        // Use days parameter or default to 30 days for treatments
        const days = daysParam ? parseInt(daysParam) : 30;
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

      // Build query parameters for treatments
      const queryParams: Record<string, string> = {
        'find[created_at][$gte]': startDate.toISOString(),
        'find[created_at][$lte]': endDate.toISOString(),
        count: '10000' // Get a large number of treatments
      };

      // Add type filter if specified
      if (typeParam) {
        queryParams['find[eventType]'] = typeParam;
      }

      // Add event type filter if specified
      if (eventTypeParam) {
        queryParams['find[eventType]'] = eventTypeParam;
      }

      // Fetch treatment data
      const treatmentResponse = await apiGet<Treatment[]>(fetch, '/api/v1/treatments.json', {
        params: queryParams
      });

      const treatments = treatmentResponse.success ? treatmentResponse.data || [] : [];

      // Sort treatments by created_at (newest first)
      treatments.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      return {
        success: true,
        data: {
          treatments,
          dateRange: {
            from: startDate,
            to: endDate
          }
        }
      };
    } catch (error) {
      console.error('Error loading treatments report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: {
          treatments: [],
          dateRange: {
            from: new Date(),
            to: new Date()
          }
        }
      };
    }
  };

  return await fetchData();
};
