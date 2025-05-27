import type { PageServerLoad } from './$types';
import type { FoodRecord, QuickPickRecord } from './types';

export const load: PageServerLoad = async ({ url, fetch }) => {
	try {		// Get the main Nightscout server URL from environment or default to localhost
		const nightscoutUrl = process.env.NIGHTSCOUT_URL || 'http://localhost:1337';
				// For local development, we can skip SSL verification setup since we're using HTTP
		// Fetch food database from the main Nightscout server
		const response = await fetch(`${nightscoutUrl}/api/v1/food.json`);

		if (!response.ok) {
			throw new Error(`Failed to fetch food data: ${response.status}`);
		}

		const records = await response.json();

		// Separate food records and quickpicks, and build categories
		const foodList: FoodRecord[] = [];
		const quickPickList: QuickPickRecord[] = [];
		const categories: Record<string, Record<string, boolean>> = {};

		records.forEach((record: any) => {
			if (record.type === 'food') {
				foodList.push(record);

				// Build categories structure
				if (record.category && !categories[record.category]) {
					categories[record.category] = {};
				}
				if (record.category && record.subcategory) {
					categories[record.category][record.subcategory] = true;
				}
			} else if (record.type === 'quickpick') {
				// Calculate carbs for quickpick
				record.carbs = 0;
				if (record.foods) {
					record.foods.forEach((food: any) => {
						record.carbs += food.carbs * (food.portions || 1);
					});
				} else {
					record.foods = [];
				}
				quickPickList.push(record);
			}
		});

		// Sort quickpicks by position
		quickPickList.sort((a, b) => (a.position || 99999) - (b.position || 99999));

		return {
			foodList,
			quickPickList,
			categories,
			nightscoutUrl
		};
	} catch (error) {
		console.error('Error loading food database:', error);

		// Return empty data on error - the client can handle showing error state
		return {
			foodList: [],
			quickPickList: [],
			categories: {},
			nightscoutUrl: process.env.NIGHTSCOUT_URL || 'http://localhost:1337',
			error: 'Failed to load food database'
		};
	}
};
