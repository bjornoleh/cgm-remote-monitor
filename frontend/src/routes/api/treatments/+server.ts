import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const treatmentData = await request.json();

		// Get the Nightscout API URL from environment or use the same host
		const apiUrl = process.env.NIGHTSCOUT_URL || `${request.url.split('/')[0]}//${request.url.split('/')[2]}`;

		// Forward the request to the Nightscout API
		const response = await fetch(`${apiUrl}/api/v1/treatments`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'api-secret': request.headers.get('api-secret') || ''
			},
			body: JSON.stringify(treatmentData)
		});

		if (!response.ok) {
			const errorText = await response.text();
			return new Response(JSON.stringify({
				success: false,
				error: `API Error: ${response.status} - ${errorText}`
			}), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const result = await response.json();

		return new Response(JSON.stringify({
			success: true,
			data: result,
			message: 'Treatment submitted successfully'
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Error in treatment submission:', error);
  }
};
