<script lang="ts">
	import { scaleBG, getDirectionInfo } from "$lib/stores/client-state.svelte.ts";
	import type { Entry } from "$lib/stores/client-state.svelte.ts";

	interface Props {
		latestSGV?: Entry;
		settings: any;
		delta?: { display: string; value: number };
		timeAgo?: string;
		alarmInProgress: boolean;
	}

	let { 
		latestSGV,
		settings = {},
		delta,
		timeAgo,
		alarmInProgress
	}: Props = $props();

	// Current BG value and status
	let currentBG = $derived(() => {
		if (!latestSGV) return null;
		
		const value = latestSGV.sgv || latestSGV.mgdl || 0;
		const scaledValue = scaleBG(value, settings.units || 'mg/dl');
		const direction = getDirectionInfo(latestSGV.direction);
		
		return {
			value: scaledValue,
			raw: value,
			direction,
			units: settings.units || 'mg/dl'
		};
	});

	// Get BG status class based on thresholds
	let bgStatusClass = $derived(() => {
		if (!currentBG) return 'bg-muted';
		
		const { raw } = currentBG;
		const thresholds = settings.thresholds || {};
		
		if (raw >= (thresholds.bgHigh || 180)) return 'bg-destructive text-destructive-foreground';
		if (raw <= (thresholds.bgLow || 55)) return 'bg-destructive text-destructive-foreground';
		if (raw > (thresholds.bgTargetTop || 140)) return 'bg-warning text-warning-foreground';
		if (raw < (thresholds.bgTargetBottom || 80)) return 'bg-warning text-warning-foreground';
		
		return 'bg-success text-success-foreground';
	});

	// Format last updated time
	let lastUpdatedText = $derived(() => {
		if (!latestSGV) return 'No data';
		
		const lastUpdate = new Date(latestSGV.mills || latestSGV.date);
		const now = new Date();
		const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);
		
		if (diffMinutes < 1) return 'Just now';
		if (diffMinutes === 1) return '1 minute ago';
		if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
		
		const diffHours = Math.floor(diffMinutes / 60);
		if (diffHours === 1) return '1 hour ago';
		return `${diffHours} hours ago`;
	});

	// Check if data is stale
	let isStale = $derived(() => {
		if (!latestSGV) return true;
		
		const lastUpdate = new Date(latestSGV.mills || latestSGV.date);
		const now = new Date();
		const diffMinutes = (now.getTime() - lastUpdate.getTime()) / 60000;
		
		return diffMinutes > 15; // Consider stale after 15 minutes
	});
</script>

<div class="bg-status-container p-4 rounded-lg border {bgStatusClass}" class:animate-pulse={alarmInProgress}>
	<div class="flex flex-col items-center space-y-2">
		<!-- Current BG Value -->
		<div class="flex items-baseline space-x-2">
			<span class="text-4xl font-bold">
				{#if currentBG}
					{currentBG.value}
				{:else}
					---
				{/if}
			</span>
			
			{#if currentBG}
				<span class="text-lg font-medium">{currentBG.units}</span>
				<span class="text-2xl" title={currentBG.direction.label}>
					{currentBG.direction.arrow}
				</span>
			{/if}
		</div>

		<!-- Delta (change from previous reading) -->
		{#if delta && currentBG}
			<div class="text-lg font-medium">
				<span class:text-destructive={delta.value > 0} class:text-success={delta.value < 0}>
					{delta.display}
				</span>
			</div>
		{/if}

		<!-- Time since last reading -->
		<div class="text-sm opacity-75" class:text-destructive={isStale}>
			{lastUpdatedText}
		</div>

		<!-- Data quality indicators -->
		{#if latestSGV?.noise !== undefined}
			<div class="flex items-center space-x-2 text-xs opacity-60">
				<span>Noise: {latestSGV.noise}</span>
				{#if latestSGV.filtered}
					<span>•</span>
					<span>Filtered: {scaleBG(latestSGV.filtered, settings.units || 'mg/dl')}</span>
				{/if}
			</div>
		{/if}

		<!-- Stale data warning -->
		{#if isStale}
			<div class="text-xs text-destructive font-medium">
				⚠ Data may be outdated
			</div>
		{/if}
	</div>
</div>

<style>
	.bg-status-container {
		transition: all 0.2s ease-in-out;
		min-height: 140px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.bg-status-container.animate-pulse {
		animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
	
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
		}
	}
</style>
