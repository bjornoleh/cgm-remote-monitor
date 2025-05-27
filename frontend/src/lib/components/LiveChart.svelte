<script lang="ts">
	import { Chart, ScaleLinear, Svg, Axis, AxisX, AxisY, Spline, Tooltip, Brush, Points, RectClipPath } from "layerchart";
	import ChartContainer from "$lib/components/ui/chart/chart-container.svelte";
	import type { Entry } from "$lib/stores/client-state.svelte.ts";
	import { scaleBG, getDirectionInfo } from "$lib/stores/client-state.svelte.ts";

	interface Props {
		entries: Entry[];
		treatments: any[];
		settings: any;
		brushExtent: [Date, Date];
		onBrushChange?: (extent: [Date, Date]) => void;
		focusRangeMS: number;
		inRetroMode: boolean;
	}

	let { 
		entries = [],
		treatments = [],
		settings = {},
		brushExtent,
		onBrushChange,
		focusRangeMS,
		inRetroMode
	}: Props = $props();

	// Transform entries into chart data
	let chartData = $derived(() => {
		return entries
			.filter(entry => entry.sgv || entry.mgdl)
			.map(entry => ({
				date: new Date(entry.mills || entry.date),
				value: entry.sgv || entry.mgdl || 0,
				direction: entry.direction,
				noise: entry.noise,
				filtered: entry.filtered,
				unfiltered: entry.unfiltered
			}))
			.sort((a, b) => a.date.getTime() - b.date.getTime());
	});

	// Define chart config for blood glucose ranges
	let chartConfig = $derived(() => ({
		bgHigh: { 
			value: settings.thresholds?.bgHigh || 180,
			color: "hsl(var(--destructive))" 
		},
		bgTargetTop: { 
			value: settings.thresholds?.bgTargetTop || 140,
			color: "hsl(var(--warning))" 
		},
		bgTargetBottom: { 
			value: settings.thresholds?.bgTargetBottom || 80,
			color: "hsl(var(--success))" 
		},
		bgLow: { 
			value: settings.thresholds?.bgLow || 55,
			color: "hsl(var(--destructive))" 
		}
	}));

	// Get Y-axis domain based on data and target ranges
	let yDomain = $derived(() => {
		if (!chartData.length) return [0, 400];
		
		const values = chartData.map(d => d.value);
		const min = Math.min(...values, chartConfig.bgLow.value);
		const max = Math.max(...values, chartConfig.bgHigh.value);
		
		// Add some padding
		const padding = (max - min) * 0.1;
		return [Math.max(0, min - padding), max + padding];
	});

	// Get X-axis domain based on brush extent or data extent
	let xDomain = $derived(() => {
		if (brushExtent && brushExtent[0] && brushExtent[1]) {
			return brushExtent;
		}
		
		if (!chartData.length) {
			const now = new Date();
			return [new Date(now.getTime() - focusRangeMS), now];
		}

		const dates = chartData.map(d => d.date);
		return [dates[0], dates[dates.length - 1]];
	});

	// Handle brush changes
	function handleBrushChange(event: CustomEvent) {
		const { selection } = event.detail;
		if (selection && onBrushChange) {
			onBrushChange([selection[0], selection[1]]);
		}
	}

	// Get color based on BG value
	function getBGColor(value: number) {
		if (value >= chartConfig.bgHigh.value) return chartConfig.bgHigh.color;
		if (value <= chartConfig.bgLow.value) return chartConfig.bgLow.color;
		if (value > chartConfig.bgTargetTop.value) return chartConfig.bgTargetTop.color;
		if (value < chartConfig.bgTargetBottom.value) return chartConfig.bgTargetTop.color;
		return chartConfig.bgTargetTop.color; // In range
	}

	// Custom tooltip formatter
	function formatTooltip(data: any) {
		if (!data || !data.value) return '';
		
		const scaledValue = scaleBG(data.value, settings.units || 'mg/dl');
		const direction = getDirectionInfo(data.direction);
		const time = data.date.toLocaleTimeString();
		
		return `${scaledValue} ${settings.units || 'mg/dl'} ${direction.arrow} at ${time}`;
	}
</script>

<ChartContainer config={chartConfig} class="h-[400px] w-full">
	<Chart 
		data={chartData} 
		x="date" 
		xDomain={xDomain}
		y="value" 
		yDomain={yDomain}
		padding={{ top: 20, right: 40, bottom: 40, left: 60 }}
	>
		<Svg>
			<RectClipPath>
				<!-- Background zones for target ranges -->
				<defs>
					<linearGradient id="bgZones" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" style="stop-color:{chartConfig.bgHigh.color};stop-opacity:0.1" />
						<stop offset="{((yDomain[1] - chartConfig.bgHigh.value) / (yDomain[1] - yDomain[0])) * 100}%" style="stop-color:{chartConfig.bgHigh.color};stop-opacity:0.1" />
						<stop offset="{((yDomain[1] - chartConfig.bgTargetTop.value) / (yDomain[1] - yDomain[0])) * 100}%" style="stop-color:{chartConfig.bgTargetTop.color};stop-opacity:0.1" />
						<stop offset="{((yDomain[1] - chartConfig.bgTargetBottom.value) / (yDomain[1] - yDomain[0])) * 100}%" style="stop-color:{chartConfig.bgTargetBottom.color};stop-opacity:0.1" />
						<stop offset="{((yDomain[1] - chartConfig.bgLow.value) / (yDomain[1] - yDomain[0])) * 100}%" style="stop-color:{chartConfig.bgLow.color};stop-opacity:0.1" />
						<stop offset="100%" style="stop-color:{chartConfig.bgLow.color};stop-opacity:0.1" />
					</linearGradient>
				</defs>
				
				<!-- Background fill -->
				<rect width="100%" height="100%" fill="url(#bgZones)" />
				
				<!-- Main BG line -->
				<Spline 
					stroke="hsl(var(--primary))" 
					strokeWidth={2}
				/>
				
				<!-- Data points -->
				<Points 
					fill={(d) => getBGColor(d.value)}
					stroke="white"
					strokeWidth={1}
					r={3}
				/>
				
				<!-- Target range lines -->
				<g stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="5,5" opacity={0.5}>
					<line 
						y1={`${((yDomain[1] - chartConfig.bgHigh.value) / (yDomain[1] - yDomain[0])) * 100}%`} 
						y2={`${((yDomain[1] - chartConfig.bgHigh.value) / (yDomain[1] - yDomain[0])) * 100}%`} 
						x1="0%" 
						x2="100%" 
					/>
					<line 
						y1={`${((yDomain[1] - chartConfig.bgTargetTop.value) / (yDomain[1] - yDomain[0])) * 100}%`} 
						y2={`${((yDomain[1] - chartConfig.bgTargetTop.value) / (yDomain[1] - yDomain[0])) * 100}%`} 
						x1="0%" 
						x2="100%" 
					/>
					<line 
						y1={`${((yDomain[1] - chartConfig.bgTargetBottom.value) / (yDomain[1] - yDomain[0])) * 100}%`} 
						y2={`${((yDomain[1] - chartConfig.bgTargetBottom.value) / (yDomain[1] - yDomain[0])) * 100}%`} 
						x1="0%" 
						x2="100%" 
					/>
					<line 
						y1={`${((yDomain[1] - chartConfig.bgLow.value) / (yDomain[1] - yDomain[0])) * 100}%`} 
						y2={`${((yDomain[1] - chartConfig.bgLow.value) / (yDomain[1] - yDomain[0])) * 100}%`} 
						x1="0%" 
						x2="100%" 
					/>
				</g>
			</RectClipPath>
			
			<!-- Axes -->
			<AxisY 
				gridlines
				tickCount={6}
				formatTick={(value) => scaleBG(value, settings.units || 'mg/dl').toString()}
			/>
			<AxisX 
				gridlines
				tickCount={6}
				formatTick={(value) => {
					const date = new Date(value);
					if (settings.timeFormat === 24) {
						return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
					}
					return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
				}}
			/>
		</Svg>
		
		<!-- Brush for time selection -->
		{#if !inRetroMode}
			<Brush
				on:brush={handleBrushChange}
				selection={brushExtent}
			/>
		{/if}
		
		<!-- Tooltip -->
		<Tooltip 
			let:data
			class="bg-background border border-border rounded px-2 py-1 text-sm shadow-lg"
		>
			{formatTooltip(data)}
		</Tooltip>
	</Chart>
</ChartContainer>

<style>
	:global(.lc-brush-selection) {
		fill: hsl(var(--primary) / 0.1);
		stroke: hsl(var(--primary));
	}
	
	:global(.lc-brush-handle) {
		fill: hsl(var(--primary));
	}
</style>
