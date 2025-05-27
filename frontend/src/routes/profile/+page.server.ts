import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    // Load profile records
    const profileResponse = await fetch('/api/v1/profile/');
    let mongoRecords = [];

    if (profileResponse.ok) {
      mongoRecords = await profileResponse.json();
    }

    // Load timezones (simplified list for now)
    const timezones = [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney'
    ];

    return {
      mongoRecords,
      timezones
    };
  } catch (err) {
    console.error('Error loading profile data:', err);
    throw error(500, 'Failed to load profile data');
  }
};

export const actions: Actions = {
  save: async ({ request, fetch }) => {
    try {
      const formData = await request.formData();
      const profileData = formData.get('profileData');

      if (!profileData) {
        return fail(400, { error: 'Profile data is required' });
      }

      const response = await fetch('/api/v1/profile/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: profileData as string
      });

      if (!response.ok) {
        return fail(response.status, { error: 'Failed to save profile' });
      }

      return {
        success: true,
        message: 'Profile saved successfully'
      };
    } catch (err) {
      console.error('Error saving profile:', err);
      return fail(500, { error: 'Internal server error' });
    }
  }
};
