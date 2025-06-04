import type { Entry, Treatment } from '../app.d.ts';

/**
 * Time utility functions
 */
export const times = {
	mins: (mins: number) => ({ msecs: mins * 60 * 1000 }),
	hours: (hours: number) => ({ msecs: hours * 60 * 60 * 1000 }),
	days: (days: number) => ({ msecs: days * 24 * 60 * 60 * 1000 })
};

/**
 * Unit conversion utilities
 */
export const units = {
	mgdlToMMOL: (mgdl: number): number => {
		return Math.round((mgdl / 18.01559) * 10) / 10;
	},
	mmolToMGDL: (mmol: number): number => {
		return Math.round(mmol * 18.01559);
	}
};

/**
 * Format time based on user settings
 */
export function formatTime(date: Date, timeFormat: number = 12, compact: boolean = false): string {
	const options: Intl.DateTimeFormatOptions = {
		hour: 'numeric',
		minute: '2-digit'
	};

	if (timeFormat === 24) {
		options.hour12 = false;
		return date.toLocaleTimeString('en-US', options);
	}

	if (compact) {
		options.minute = 'numeric';
	}

	return date.toLocaleTimeString('en-US', options).toLowerCase();
}

/**
 * Calculate delta between two BG readings
 */
export function calculateDelta(current: Entry, previous: Entry, unit: string = 'mg/dl') {
	if (!current || !previous) return null;

	const currentValue = current.sgv || current.mgdl || 0;
	const previousValue = previous.sgv || previous.mgdl || 0;
	const diff = currentValue - previousValue;

	const scaledDiff = unit === 'mmol' ? units.mgdlToMMOL(Math.abs(diff)) : Math.abs(diff);
	const sign = diff >= 0 ? '+' : '-';

	return {
		display: `${sign}${scaledDiff}`,
		value: diff,
		scaled: scaledDiff
	};
}

/**
 * Get BG trend direction information
 */
export function getDirectionInfo(direction?: string) {
	const directions: Record<string, { label: string; arrow: string; css: string }> = {
		'DoubleUp': { label: 'rising very fast', arrow: '⇈', css: 'text-red-500' },
		'SingleUp': { label: 'rising', arrow: '↗', css: 'text-orange-500' },
		'FortyFiveUp': { label: 'rising slowly', arrow: '↗', css: 'text-yellow-500' },
		'Flat': { label: 'stable', arrow: '→', css: 'text-green-500' },
		'FortyFiveDown': { label: 'falling slowly', arrow: '↘', css: 'text-yellow-500' },
		'SingleDown': { label: 'falling', arrow: '↘', css: 'text-orange-500' },
		'DoubleDown': { label: 'falling very fast', arrow: '⇊', css: 'text-red-500' },
		'NOT COMPUTABLE': { label: 'unknown', arrow: '?', css: 'text-gray-500' },
		'RATE OUT OF RANGE': { label: 'out of range', arrow: '?', css: 'text-gray-500' }
	};

	return directions[direction || 'Flat'] || directions['Flat'];
}

/**
 * Determine BG status level based on thresholds
 */
export function getBGStatus(value: number, thresholds: any) {
	if (!thresholds) {
		thresholds = {
			bgHigh: 180,
			bgTargetTop: 140,
			bgTargetBottom: 80,
			bgLow: 55
		};
	}

	if (value >= thresholds.bgHigh) return 'urgent-high';
	if (value <= thresholds.bgLow) return 'urgent-low';
	if (value > thresholds.bgTargetTop) return 'high';
	if (value < thresholds.bgTargetBottom) return 'low';
	return 'in-range';
}

/**
 * Get color class for BG status
 */
export function getBGColorClass(status: string) {
	const colors: Record<string, string> = {
		'urgent-high': 'bg-red-500 text-white',
		'urgent-low': 'bg-red-500 text-white',
		'high': 'bg-orange-500 text-white',
		'low': 'bg-yellow-500 text-black',
		'in-range': 'bg-green-500 text-white'
	};

	return colors[status] || 'bg-gray-500 text-white';
}

/**
 * Check if data is stale based on timestamp
 */
export function isDataStale(timestamp: number, thresholdMinutes: number = 15): boolean {
	const now = Date.now();
	const diffMinutes = (now - timestamp) / (60 * 1000);
	return diffMinutes > thresholdMinutes;
}

/**
 * Generate human-readable time ago string
 */
export function timeAgo(timestamp: number): string {
	const now = Date.now();
	const diffMs = now - timestamp;
	const diffMinutes = Math.floor(diffMs / (60 * 1000));
	const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
	const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

	if (diffMinutes < 1) return 'Just now';
	if (diffMinutes === 1) return '1 minute ago';
	if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
	if (diffHours === 1) return '1 hour ago';
	if (diffHours < 24) return `${diffHours} hours ago`;
	if (diffDays === 1) return '1 day ago';
	return `${diffDays} days ago`;
}

/**
 * Filter entries by time range
 */
export function filterEntriesByTimeRange(entries: Entry[], startTime: Date, endTime: Date): Entry[] {
	return entries.filter(entry => {
		const entryTime = entry.mills || entry.date;
		return entryTime >= startTime.getTime() && entryTime <= endTime.getTime();
	});
}

/**
 * Filter treatments by time range
 */
export function filterTreatmentsByTimeRange(treatments: Treatment[], startTime: Date, endTime: Date): Treatment[] {
	return treatments.filter(treatment => {
		const treatmentTime = new Date(treatment.timestamp || treatment.created_at).getTime();
		return treatmentTime >= startTime.getTime() && treatmentTime <= endTime.getTime();
	});
}

/**
 * Generate chart data from entries
 */
export function prepareChartData(entries: Entry[]) {
	return entries
		.filter(entry => entry.sgv || entry.mgdl)
		.map(entry => ({
			date: new Date(entry.mills || entry.date),
			value: entry.sgv || entry.mgdl || 0,
			direction: entry.direction,
			noise: entry.noise,
			filtered: entry.filtered,
			unfiltered: entry.unfiltered,
			original: entry
		}))
		.sort((a, b) => a.date.getTime() - b.date.getTime());
}
