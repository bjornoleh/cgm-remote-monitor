// See https://svelte.dev/docs/kit/types#app
// for information about these interfaces



export interface ServerSettings {
	name: string;
	version: string;
	head: string;
	apiEnabled: boolean;
	runtimeState: string;
	settings: Record<string, unknown>;
	authorized?: Record<string, unknown>;
}

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}

		// Base page data interface for the main app
		interface BasePageData {
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

		// Main PageData interface that allows additional properties for reports
		interface PageData extends Partial<BasePageData> {
			[key: string]: any;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
