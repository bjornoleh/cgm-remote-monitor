import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Mock data for testing the clock functionality
export const GET: RequestHandler = async ({ url }) => {
  // Simulate authentication (in real implementation, this would check actual auth)
  const token = url.searchParams.get('token');
  const secret = url.searchParams.get('secret');

  // Mock BG data that matches the expected format
  const mockData = {
    bgnow: {
      sgvs: [{
        sgv: 120,
        scaled: 120,
        direction: 'Flat',
        mills: Date.now() - (5 * 60 * 1000), // 5 minutes ago
        datetime: new Date(Date.now() - (5 * 60 * 1000)).toISOString()
      }]
    },
    delta: {
      display: '+2 mg/dL',
      mgdl: 2
    },
    settings: {
      units: 'mg/dL',
      showClockLastTime: true,
      showClockDelta: true
    }
  };

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));

  return json(mockData);
};
