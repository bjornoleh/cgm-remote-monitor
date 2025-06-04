import type { Thresholds } from "$lib/components/reports/types";

export interface Entry {
	_id: string;
	sgv?: number;
	mgdl?: number;
	direction?: string;
	date: number;
	mills: number;
	type: string;
	filtered?: number;
	unfiltered?: number;
	rssi?: number;
	noise?: number;
	// Additional fields for demo data
	dateString?: string;
	device?: string;
	delta?: number;
}

export interface Treatment {
	_id: string;
	eventType: string;
	created_at: string;
	timestamp: string;
	carbs?: number;
	insulin?: number;
	notes?: string;
	reason?: string;
	glucose?: number;
	glucoseType?: string;
	food?: string;
	protein?: number;
	fat?: number;
	absorptionTime?: number;
	duration?: number;
	percent?: number;
	absolute?: number;
	rate?: number;
	profile?: string;
	enteredBy?: string;
	// Additional fields for demo data
	mills?: number;
	units?: string;
	temp?: string;
	splitNow?: number;
	splitExt?: number;
	targetTop?: number;
	targetBottom?: number;
}

export interface DeviceStatus {
	_id: string;
	device: string;
	created_at: string;
	pump?: {
		battery?: {
			percent?: number;
			voltage?: number;
		};
		reservoir?: number;
		clock?: string;
		status?: {
			status: string;
			bolusing: boolean;
			suspended: boolean;
		};
		iob?: {
			timestamp: string;
			bolusiob: number;
			basaliob: number;
		};
	};
	uploader?: {
		battery: number;
		name?: string;
		type?: string;
	};
	loop?: any;
	openaps?: {
		suggested?: any;
		enacted?: any;
		iob?: any;
	};
	// Additional fields for demo data
	mills?: number;
}

export interface ServerSettings {
	name?: string;
	version?: string;
	apiEnabled?: boolean;
	careportalEnabled?: boolean;
	boluscalcEnabled?: boolean;
	head?: string;
	runtimeState?: string;
	settings?: {
		units?: string;
		timeFormat?: number;
		nightMode?: boolean;
		showRawbg?: string;
		customTitle?: string;
		theme?: string;
		alarmUrgentHigh?: boolean;
		alarmHigh?: boolean;
		alarmLow?: boolean;
		alarmUrgentLow?: boolean;
		alarmTimeagoWarn?: boolean;
		alarmTimeagoWarnMins?: number;
		alarmTimeagoUrgent?: boolean;
		alarmTimeagoUrgentMins?: number;
		language?: string;
		enable?: string;
		showPlugins?: string;
		alarmTypes?: string;
		editMode?: boolean;
		thresholds?: {
			bgHigh?: number;
			bgTargetTop?: number;
			bgTargetBottom?: number;
			bgLow?: number;
		};
		extendedSettings?: any;
	};
	extendedSettings?: any;
	authorized?: {
		role?: string[];
	};
}

export interface ClientSettings {
	units: 'mg/dl' | 'mmol';
	timeFormat: 12 | 24;
	nightMode: boolean;
	showBGON: boolean;
	showIOB: boolean;
	showCOB: boolean;
	showBasal: boolean;
	showPlugins: string[];
	language: string;
	theme: string;
	alarmUrgentHigh: boolean;
	alarmUrgentHighMins: number[];
	alarmHigh: boolean;
	alarmHighMins: number[];
	alarmLow: boolean;
	alarmLowMins: number[];
	alarmUrgentLow: boolean;
	alarmUrgentLowMins: number[];
	alarmTimeagoWarn: boolean;
	alarmTimeagoWarnMins: number;
	alarmTimeagoUrgent: boolean;
	alarmTimeagoUrgentMins: number;
	showForecast: boolean;
	focusHours: number;
	heartbeat: number;
	baseURL: string;
	authDefaultRoles: string;
	thresholds: Thresholds
}

export interface ClientState {
	entries: Entry[];
	treatments: Treatment[];
	deviceStatus: DeviceStatus[];
	settings: ClientSettings;
	now: number;
	latestSGV?: Entry;
	isLoading: boolean;
	isConnected: boolean;
	alarmInProgress: boolean;
	currentAnnouncement?: {
		received: number;
		title: string;
		message: string;
	};
	brushExtent: [Date, Date];
	focusRangeMS: number;
	inRetroMode: boolean;
}

// Create reactive state that can be shared across components
let clientState = $state<ClientState>({
	entries: [],
	treatments: [],
	deviceStatus: [],
	settings: {} as ClientSettings,
	now: Date.now(),
	latestSGV: undefined,
	isLoading: true,
	isConnected: false,
	alarmInProgress: false,
	currentAnnouncement: undefined,
	brushExtent: [new Date(Date.now() - 3 * 60 * 60 * 1000), new Date()], // 3 hours default
	focusRangeMS: 3 * 60 * 60 * 1000, // 3 hours in ms
	inRetroMode: false
});

export function getClientState() {
	return clientState;
}

export function updateClientState(updates: Partial<ClientState>) {
	Object.assign(clientState, updates);
}

// Utility functions
export function scaleBG(bg: number, units: string): number {
	if (units === 'mmol') {
		return Math.round((bg / 18.01559) * 10) / 10;
	}
	return bg;
}

export function formatTime(time: Date, timeFormat: number, compact = false): string {
	const options: Intl.DateTimeFormatOptions = {
		hour: 'numeric',
		minute: '2-digit'
	};

	if (timeFormat === 24) {
		options.hour12 = false;
	}

	if (compact && timeFormat !== 24) {
		options.minute = 'numeric';
	}

	return time.toLocaleTimeString(undefined, options);
}

export function getDirectionInfo(direction?: string) {
	const directions: Record<string, { label: string; arrow: string }> = {
		'DoubleUp': { label: 'rising very fast', arrow: '⇈' },
		'SingleUp': { label: 'rising', arrow: '↗' },
		'FortyFiveUp': { label: 'rising slowly', arrow: '↗' },
		'Flat': { label: 'stable', arrow: '→' },
		'FortyFiveDown': { label: 'falling slowly', arrow: '↘' },
		'SingleDown': { label: 'falling', arrow: '↘' },
		'DoubleDown': { label: 'falling very fast', arrow: '⇊' },
		'NOT COMPUTABLE': { label: 'unknown', arrow: '?' },
		'RATE OUT OF RANGE': { label: 'out of range', arrow: '?' }
	};

	return directions[direction || 'Flat'] || directions['Flat'];
}
