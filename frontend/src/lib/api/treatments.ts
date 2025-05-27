// API functions for treatment submission
export interface TreatmentData {
	eventType: string;
	created_at?: string;
	timestamp?: string;
	carbs?: number;
	insulin?: number;
	notes?: string;
	reason?: string;
	target?: string;
	duration?: number;
	percent?: number;
	absolute?: number;
	profile?: string;
	glucose?: number;
	glucoseType?: string;
	units?: string;
	[key: string]: any;
}

export interface APIResponse {
	success: boolean;
	message?: string;
	data?: any;
	error?: string;
}

// Submit a treatment to the Nightscout API
export async function submitTreatment(treatment: TreatmentData, apiSecret?: string): Promise<APIResponse> {
	try {
		// Prepare the treatment data
		const treatmentData = {
			...treatment,
			created_at: treatment.created_at || new Date().toISOString(),
			timestamp: treatment.timestamp || new Date().toISOString(),
			enteredBy: 'nightscout-client'
		};

		// Build headers
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		// Add API secret if provided
		if (apiSecret) {
			headers['api-secret'] = apiSecret;
		}

		// Submit to our SvelteKit API endpoint
		const response = await fetch('/api/treatments', {
			method: 'POST',
			headers,
			body: JSON.stringify(treatmentData)
		});

		const result = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: result.error || `HTTP ${response.status}`
			};
		}

		return result;

	} catch (error) {
		console.error('Error submitting treatment:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred'
		};
	}
}

// Update an existing treatment
export async function updateTreatment(treatmentId: string, treatment: Partial<TreatmentData>, apiSecret?: string): Promise<APIResponse> {
	try {
		const baseURL = window.location.origin;

		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		if (apiSecret) {
			headers['api-secret'] = apiSecret;
		}

		const response = await fetch(`${baseURL}/api/v1/treatments/${treatmentId}`, {
			method: 'PUT',
			headers,
			body: JSON.stringify(treatment)
		});

		if (!response.ok) {
			const errorText = await response.text();
			return {
				success: false,
				error: `HTTP ${response.status}: ${errorText}`
			};
		}

		const result = await response.json();
		
		return {
			success: true,
			message: 'Treatment updated successfully',
			data: result
		};

	} catch (error) {
		console.error('Error updating treatment:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred'
		};
	}
}

// Delete a treatment
export async function deleteTreatment(treatmentId: string, apiSecret?: string): Promise<APIResponse> {
	try {
		const baseURL = window.location.origin;

		const headers: Record<string, string> = {};

		if (apiSecret) {
			headers['api-secret'] = apiSecret;
		}

		const response = await fetch(`${baseURL}/api/v1/treatments/${treatmentId}`, {
			method: 'DELETE',
			headers
		});

		if (!response.ok) {
			const errorText = await response.text();
			return {
				success: false,
				error: `HTTP ${response.status}: ${errorText}`
			};
		}

		return {
			success: true,
			message: 'Treatment deleted successfully'
		};

	} catch (error) {
		console.error('Error deleting treatment:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred'
		};
	}
}

// Fetch current API secret from localStorage or prompt user
export function getAPISecret(): string | null {
	// Try to get from localStorage first
	const stored = localStorage.getItem('nightscout-api-secret');
	if (stored) {
		return stored;
	}

	// Prompt user for API secret if not stored
	const secret = prompt('Please enter your Nightscout API secret to submit treatments:');
	if (secret) {
		localStorage.setItem('nightscout-api-secret', secret);
		return secret;
	}

	return null;
}

// Clear stored API secret
export function clearAPISecret(): void {
	localStorage.removeItem('nightscout-api-secret');
}
