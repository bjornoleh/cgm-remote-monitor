import { error } from '@sveltejs/kit';
import { demoData } from './data/demo-data.js';

export interface ApiCallOptions {
	/** API endpoint path (e.g., '/api/v1/entries.json') */
	endpoint: string;
	/** HTTP method (default: 'GET') */
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	/** Request body for POST/PUT requests */
	body?: unknown;
	/** Additional headers to include */
	headers?: Record<string, string>;
	/** Query parameters to append to the URL */
	params?: Record<string, string | number>;
	/** Whether to throw SvelteKit errors on failure (default: true) */
	throwOnError?: boolean;
}

export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	status?: number;
	statusText?: string;
}

/**
 * Handle demo requests by returning dummy data based on endpoint
 */
function handleDemoRequest<T>(options: ApiCallOptions): Promise<ApiResponse<T>> {
	const { endpoint } = options;

	// Add a small delay to simulate network request
	return new Promise((resolve) => {
		setTimeout(() => {			let data: unknown;

			if (endpoint.includes('/api/v1/entries') || endpoint.includes('/entries.json')) {
				data = demoData.entries();
			} else if (endpoint.includes('/api/v1/treatments') || endpoint.includes('/treatments.json')) {
				data = demoData.treatments();
			} else if (endpoint.includes('/api/v1/devicestatus') || endpoint.includes('/devicestatus.json')) {
				data = demoData.devicestatus();
			} else if (endpoint.includes('/api/v1/status') || endpoint === '/api/v1/status.json') {
				data = demoData.status();
			} else if (endpoint.includes('/api/v1/profile') || endpoint.includes('/profile.json')) {
				data = demoData.profile();
			} else if (endpoint.includes('/api/v1/food/quickpicks') || endpoint.includes('/food/quickpicks')) {
				data = demoData.quickpicks();
			} else if (endpoint.includes('/api/v1/food') || endpoint.includes('/food.json')) {
				// Combine regular foods and quickpicks for the main food endpoint
				const foods = demoData.food();
				const quickpicks = demoData.quickpicks();
				data = [...foods, ...quickpicks];
			} else if (endpoint.includes('hourly-stats')) {
				data = demoData.hourlyStats();
			} else {
				// Default response for unknown endpoints
				data = { message: 'Demo data not available for this endpoint' };
			}

			resolve({
				success: true,
				data: data as T,
				status: 200,
				statusText: 'OK'
			});
		}, Math.random() * 500 + 100); // 100-600ms delay
	});
}

/**
 * Makes an authenticated API call to the Nightscout backend
 * @param fetch - SvelteKit fetch function
 * @param options - API call configuration
 * @returns Promise with the API response
 */
export async function apiCall<T = unknown>(
	fetch: typeof globalThis.fetch,
	options: ApiCallOptions
): Promise<ApiResponse<T>> {
	try {
		// Check if we're in demo mode
		if (import.meta.env.MODE === 'demo') {
			return handleDemoRequest<T>(options);
		}

        const {
			endpoint,
			method = 'GET',
			body,
			headers: customHeaders = {},
			params,
			throwOnError = true
		} = options;
		// Build base URL for local backend
		const baseUrl = 'http://localhost:1337';
		let url = baseUrl + endpoint;
		if (params) {
			const searchParams = new URLSearchParams();
			Object.entries(params).forEach(([key, value]) => {
				searchParams.append(key, String(value));
			});
			url += (endpoint.includes('?') ? '&' : '?') + searchParams.toString();
		}

		// Add cache busting timestamp for GET requests
		if (method === 'GET') {
			url += (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
		}

		// Set up headers
		const headers = new Headers();
				// Add custom headers
		Object.entries(customHeaders).forEach(([key, value]) => {
			headers.set(key, value);
		});

		// Note: Authentication is handled by the backend internally
		// when running locally, so no auth headers needed here

		// Set content type for requests with body
		if (body && !headers.has('Content-Type')) {
			headers.set('Content-Type', 'application/json');
		}

		// Make the request
		const requestOptions: RequestInit = {
			method,
			headers
		};

		if (body) {
			requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
		}

		const response = await fetch(url, requestOptions);

		// Handle response
		if (!response.ok) {
			const errorMessage = response.status === 401
				? 'Authentication failed. Please check your token or API secret.'
				: `API call failed: ${response.status} ${response.statusText}`;

			if (throwOnError) {
				throw error(response.status, errorMessage);
			}

			return {
				success: false,
				error: errorMessage,
				status: response.status,
				statusText: response.statusText
			};
		}

		// Parse response data
		let data: T;
		const contentType = response.headers.get('content-type');

		if (contentType && contentType.includes('application/json')) {
			data = await response.json();
		} else {
			data = await response.text() as T;
		}

		return {
			success: true,
			data,
			status: response.status,
			statusText: response.statusText
		};
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown API error';

		if (options.throwOnError && !(err instanceof Error && err.message.includes('error('))) {
			throw error(500, `API call failed: ${errorMessage}`);
		}

		return {
			success: false,
			error: errorMessage
		};
	}
}

/**
 * Convenience function for GET requests
 */
export async function apiGet<T = unknown>(
	fetch: typeof globalThis.fetch,
	endpoint: string,
	options: Omit<ApiCallOptions, 'endpoint' | 'method'> = {}
): Promise<ApiResponse<T>> {
	return apiCall<T>(fetch, { ...options, endpoint, method: 'GET' });
}

/**
 * Convenience function for POST requests
 */
export async function apiPost<T = unknown>(
	fetch: typeof globalThis.fetch,
	endpoint: string,
	body?: unknown,
	options: Omit<ApiCallOptions, 'endpoint' | 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
	return apiCall<T>(fetch, { ...options, endpoint, method: 'POST', body });
}

/**
 * Convenience function for PUT requests
 */
export async function apiPut<T = unknown>(
	fetch: typeof globalThis.fetch,
	endpoint: string,
	body?: unknown,
	options: Omit<ApiCallOptions, 'endpoint' | 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
	return apiCall<T>(fetch, { ...options, endpoint, method: 'PUT', body });
}

/**
 * Convenience function for DELETE requests
 */
export async function apiDelete<T = unknown>(
	fetch: typeof globalThis.fetch,
	endpoint: string,
	options: Omit<ApiCallOptions, 'endpoint' | 'method'> = {}
): Promise<ApiResponse<T>> {
	return apiCall<T>(fetch, { ...options, endpoint, method: 'DELETE' });
}
