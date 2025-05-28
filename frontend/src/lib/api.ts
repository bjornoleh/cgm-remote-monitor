import { error } from '@sveltejs/kit';

export interface ApiCallOptions {
	/** API endpoint path (e.g., '/api/v1/entries.json') */
	endpoint: string;
	/** HTTP method (default: 'GET') */
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	/** Request body for POST/PUT requests */
	body?: any;
	/** Additional headers to include */
	headers?: Record<string, string>;
	/** Query parameters to append to the URL */
	params?: Record<string, string | number>;
	/** Whether to throw SvelteKit errors on failure (default: true) */
	throwOnError?: boolean;
}

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	status?: number;
	statusText?: string;
}

/**
 * Makes an authenticated API call to the Nightscout backend
 * @param fetch - SvelteKit fetch function
 * @param options - API call configuration
 * @returns Promise with the API response
 */
export async function apiCall<T = any>(
	fetch: typeof globalThis.fetch,
	options: ApiCallOptions
): Promise<ApiResponse<T>> {
	try {
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
export async function apiGet<T = any>(
	fetch: typeof globalThis.fetch,
	endpoint: string,
	options: Omit<ApiCallOptions, 'endpoint' | 'method'> = {}
): Promise<ApiResponse<T>> {
	return apiCall<T>(fetch, { ...options, endpoint, method: 'GET' });
}

/**
 * Convenience function for POST requests
 */
export async function apiPost<T = any>(
	fetch: typeof globalThis.fetch,
	endpoint: string,
	body?: any,
	options: Omit<ApiCallOptions, 'endpoint' | 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
	return apiCall<T>(fetch, { ...options, endpoint, method: 'POST', body });
}

/**
 * Convenience function for PUT requests
 */
export async function apiPut<T = any>(
	fetch: typeof globalThis.fetch,
	endpoint: string,
	body?: any,
	options: Omit<ApiCallOptions, 'endpoint' | 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
	return apiCall<T>(fetch, { ...options, endpoint, method: 'PUT', body });
}

/**
 * Convenience function for DELETE requests
 */
export async function apiDelete<T = any>(
	fetch: typeof globalThis.fetch,
	endpoint: string,
	options: Omit<ApiCallOptions, 'endpoint' | 'method'> = {}
): Promise<ApiResponse<T>> {
	return apiCall<T>(fetch, { ...options, endpoint, method: 'DELETE' });
}
