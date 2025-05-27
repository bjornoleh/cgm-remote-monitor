import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ url, fetch }) {
	try {
		// Get initial server status and settings
		const token = url.searchParams.get('token');
		const secret = url.searchParams.get('secret');
		
		let statusUrl = '/api/v1/status.json?t=' + new Date().getTime();
		if (secret) statusUrl += '&secret=' + secret;
		else if (token) statusUrl += '&token=' + token;

		const headers = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		} else if (secret) {
			headers['api-secret'] = secret;
		}

		const statusResponse = await fetch(statusUrl, { headers });
		
		if (!statusResponse.ok) {
			throw error(statusResponse.status, 'Failed to fetch server status');
		}

		const serverSettings = await statusResponse.json();

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
		}

		// Fetch initial data in parallel
		const [entriesResponse, deviceStatusResponse, treatmentsResponse] = await Promise.allSettled([
			fetch('/api/v1/entries.json?count=288', { headers }), // 48 hours of 10-min readings
			fetch('/api/v1/devicestatus.json?count=288', { headers }),
			fetch('/api/v1/treatments.json?count=200', { headers })
		]);

		const entries = entriesResponse.status === 'fulfilled' && entriesResponse.value.ok 
			? await entriesResponse.value.json() 
			: [];

		const deviceStatus = deviceStatusResponse.status === 'fulfilled' && deviceStatusResponse.value.ok
			? await deviceStatusResponse.value.json()
			: [];

		const treatments = treatmentsResponse.status === 'fulfilled' && treatmentsResponse.value.ok
			? await treatmentsResponse.value.json()
			: [];

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
