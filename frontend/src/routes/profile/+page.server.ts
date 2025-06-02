import { error, fail, type Actions } from '@sveltejs/kit';
import { apiGet, apiPost } from '$lib/api.js';

export const load = async ({ fetch }) => {
  try {
    // Load profile records using API helper
    const profileResponse = await apiGet(fetch, '/api/v1/profile/', {
      throwOnError: false
    });    let mongoRecords: unknown[] = [];
    if (profileResponse.success && profileResponse.data) {
      mongoRecords = Array.isArray(profileResponse.data) ? profileResponse.data : [profileResponse.data];
    }

    return {
      mongoRecords,
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
      }      // Parse the JSON string to pass as proper object to API helper
      let parsedProfileData;
      try {
        parsedProfileData = JSON.parse(profileData as string);
      } catch {
        return fail(400, { error: 'Invalid profile data format' });
      }

      const response = await apiPost(fetch, '/api/v1/profile/', parsedProfileData, {
        throwOnError: false
      });

      if (!response.success) {
        return fail(response.status || 500, {
          error: response.error || 'Failed to save profile'
        });
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
