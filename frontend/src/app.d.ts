// See https://svelte.dev/docs/kit/types#app
// for information about these interfaces

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
}

export interface Treatment {
	_id: string;
	eventType: string;
	created_at: string;
	timestamp: string;
	carbs?: number;
	insulin?: number;
	notes?: string;
}

export interface DeviceStatus {
	_id: string;
	device: string;
	created_at: string;
	pump?: any;
	uploader?: any;
	loop?: any;
}

export interface ServerSettings {
	name: string;
	version: string;
	head: string;
	apiEnabled: boolean;
	runtimeState: string;
	settings: any;
	authorized?: any;
}

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			loading: boolean;
			loadingMessage?: string;
			error?: string;
			serverSettings: ServerSettings | null;
			entries: Entry[];
			treatments: Treatment[];
			deviceStatus: DeviceStatus[];
			initialData?: {
				now: number;
				history: number;
				focusHours: number;
			};
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
