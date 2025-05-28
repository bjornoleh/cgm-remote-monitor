import { apiGet } from '$lib/api.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	try {
		// Get initial server status and settings
		const statusResponse = await apiGet(fetch, '/api/v1/status.json');

		if (!statusResponse.success) {
			// This will throw a SvelteKit error with proper status code
			return;
		}

		const serverSettings = statusResponse.data;

		if (serverSettings.runtimeState !== 'loaded') {
			// Server is still loading, return loading state
			return {
				loading: true,
				loadingMessage: 'Server is starting and still loading data',
				serverSettings: null,
				entries: [],
				deviceStatus: [],
				treatments: []
			};
		}		// Fetch initial data in parallel
		const [entriesResponse, deviceStatusResponse, treatmentsResponse] = await Promise.allSettled([
			apiGet(fetch, '/api/v1/entries.json', {
				params: { count: 288 }, // 48 hours of 10-min readings
				throwOnError: false
			}),
			apiGet(fetch, '/api/v1/devicestatus.json', {
				params: { count: 288 },
				throwOnError: false
			}),
			apiGet(fetch, '/api/v1/treatments.json', {
				params: { count: 200 },
				throwOnError: false
			})
		]);

		const entries = entriesResponse.status === 'fulfilled' && entriesResponse.value.success
			? entriesResponse.value.data || []
			: [];

		const deviceStatus = deviceStatusResponse.status === 'fulfilled' && deviceStatusResponse.value.success
			? deviceStatusResponse.value.data || []
			: [];

		const treatments = treatmentsResponse.status === 'fulfilled' && treatmentsResponse.value.success
			? treatmentsResponse.value.data || []
			: [];

		// Log any failed API calls for debugging
		if (entriesResponse.status === 'rejected') {
			console.error('Failed to fetch entries:', entriesResponse.reason);
		} else if (!entriesResponse.value.success) {
			console.error('Entries API returned error:', entriesResponse.value.error);
		}

		if (deviceStatusResponse.status === 'rejected') {
			console.error('Failed to fetch device status:', deviceStatusResponse.reason);
		} else if (!deviceStatusResponse.value.success) {
			console.error('Device status API returned error:', deviceStatusResponse.value.error);
		}

		if (treatmentsResponse.status === 'rejected') {
			console.error('Failed to fetch treatments:', treatmentsResponse.reason);
		} else if (!treatmentsResponse.value.success) {
			console.error('Treatments API returned error:', treatmentsResponse.value.error);
		}

		return {
			loading: false,
			serverSettings,
			entries,
			deviceStatus,
			treatments,
			initialData: {
				now: Date.now(),
				history: 48, // hours
				focusHours: 3
			}
		};

	} catch (err) {
		console.error('Failed to load initial data:', err);
		return {
			loading: false,
			error: 'Failed to connect to Nightscout server',
			serverSettings: null,
			entries: [],
			deviceStatus: [],
			treatments: []
		};
	}
}
