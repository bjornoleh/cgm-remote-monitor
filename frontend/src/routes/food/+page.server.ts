import type { PageServerLoad } from './$types';
import type { FoodRecord, QuickPickRecord } from './types';
import { apiGet } from '$lib/api';

export const load: PageServerLoad = async ({ fetch }) => {
	try {		// Use the centralized API function to fetch food data
		// This automatically handles demo mode and authentication
		const response = await apiGet<(FoodRecord | QuickPickRecord)[]>(fetch, '/api/v1/food.json', {
			throwOnError: false
		});

		if (!response.success || !response.data) {
			throw new Error(`Failed to fetch food data: ${response.error || 'Unknown error'}`);
		}

		const records = response.data;
		// Separate food records and quickpicks, and build categories
		const foodList: FoodRecord[] = [];
		const quickPickList: QuickPickRecord[] = [];
		const categories: Record<string, Record<string, boolean>> = {};

		records.forEach((record: FoodRecord | QuickPickRecord) => {
			if (record.type === 'food') {
				foodList.push(record as FoodRecord);

				// Build categories structure
				const foodRecord = record as FoodRecord;
				if (foodRecord.category && !categories[foodRecord.category]) {
					categories[foodRecord.category] = {};
				}
				if (foodRecord.category && foodRecord.subcategory) {
					categories[foodRecord.category][foodRecord.subcategory] = true;
				}
			} else if (record.type === 'quickpick') {
				const quickPickRecord = record as QuickPickRecord;
				// Calculate carbs for quickpick
				quickPickRecord.carbs = 0;
				if (quickPickRecord.foods) {
					quickPickRecord.foods.forEach((food) => {
						quickPickRecord.carbs += food.carbs * (food.portions || 1);
					});
				} else {
					quickPickRecord.foods = [];
				}
				quickPickList.push(quickPickRecord);
			}
		});

		// Sort quickpicks by position
		quickPickList.sort((a, b) => (a.position || 99999) - (b.position || 99999));
		return {
			foodList,
			quickPickList,
			categories,
			nightscoutUrl: process.env.NIGHTSCOUT_URL || 'http://localhost:1337'
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
