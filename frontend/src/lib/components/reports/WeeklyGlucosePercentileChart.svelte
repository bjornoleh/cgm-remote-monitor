<script lang="ts">
  import {
    Chart,
    Axis,
    Svg,
    Tooltip,
    Area,
    Highlight,
    asAny,
  } from "layerchart";
  import { scaleTime, scaleOrdinal } from "d3-scale";
  import { flatten } from "@layerstack/utils";
  import { TIR_COLORS_CSS, TIR_COLORS_RGB } from "$lib/constants/tir-colors";

  interface WeeklyPercentileData {
    date: Date;
    low: number; // 10th percentile
    p25: number; // 25th percentile
    median: number; // 50th percentile
    p75: number; // 75th percentile
    high: number; // 90th percentile
  }

  interface Props {
    data: WeeklyPercentileData[];
  }

  let { data }: Props = $props();

  // Define percentile colors using TIR color constants
  // Map percentile ranges to appropriate glucose ranges
  const percentileColors = {
    "Very Low (0-10%)": TIR_COLORS_RGB.severeLow, // <54 mg/dL range
    "Low (10-25%)": TIR_COLORS_RGB.low, // 54-69 mg/dL range
    "Normal (25-75%)": TIR_COLORS_RGB.target, // 70-180 mg/dL range
    "High (75-90%)": TIR_COLORS_RGB.high, // 181-250 mg/dL range
    "Very High (90-100%)": TIR_COLORS_RGB.severeHigh, // >250 mg/dL range
  };

  // Transform data for stacked area chart - each series represents a percentile band
  const stackData = $derived.by(() => {
    if (!data || data.length === 0) return [];

    const maxGlucose = 400; // Normalize glucose values to this max

    return [
      // Very Low: 0 to 10th percentile
      data.map((d, i) => ({
        data: { date: d.date, index: i },
        0: 0,
        1: d.low / maxGlucose,
      })),
      // Low: 10th to 25th percentile
      data.map((d, i) => ({
        data: { date: d.date, index: i },
        0: d.low / maxGlucose,
        1: d.p25 / maxGlucose,
      })),
      // Normal: 25th to 75th percentile
      data.map((d, i) => ({
        data: { date: d.date, index: i },
        0: d.p25 / maxGlucose,
        1: d.p75 / maxGlucose,
      })),
      // High: 75th to 90th percentile
      data.map((d, i) => ({
        data: { date: d.date, index: i },
        0: d.p75 / maxGlucose,
        1: d.high / maxGlucose,
      })),
      // Very High: 90th percentile to theoretical max
      data.map((d, i) => ({
        data: { date: d.date, index: i },
        0: d.high / maxGlucose,
        1: 1, // Represents top of chart (400 mg/dL)
      })),
    ];
  });

  // Format date for tooltip
  function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // Format glucose value
  function formatGlucose(value: number): string {
    return Math.round(value * 400).toString();
  }
</script>

<div class="w-full">
  <div class="mb-4">
    <h3 class="text-lg font-semibold text-foreground">
      Weekly Glucose Percentile Distribution
    </h3>
    <p class="text-sm text-muted-foreground">
      Stacked area chart showing glucose distribution across percentiles over
      time
    </p>
  </div>

  {#if stackData.length > 0}
    <div class="h-[400px] p-4 border rounded-sm">
      <Chart
        data={stackData}
        flatData={flatten(stackData)}
        x={(d) => asAny(d).data.date}
        xScale={scaleTime()}
        y={[0, 1]}
        yNice
        c="key"
        cScale={scaleOrdinal()}
        cDomain={Object.keys(percentileColors)}
        cRange={Object.values(percentileColors)}
        padding={{ left: 60, bottom: 60, top: 20, right: 20 }}
        tooltip={{ mode: "bisect-x" }}
      >
        <Svg>
          <!-- Y-axis (glucose values) -->
          <Axis
            placement="left"
            grid
            rule
            label="Glucose (mg/dL)"
            format={(d) => Math.round(d * 400).toString()}
          />
          <!-- X-axis (dates) -->
          <Axis
            placement="bottom"
            rule
            label="Date"
            format={(d) =>
              d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          />
          <!-- Glucose target range lines -->
          <g class="target-lines">
            <!-- Target range background (70-180 mg/dL) -->
            <rect
              x="0%"
              y={`${(1 - 180 / 400) * 100}%`}
              width="100%"
              height={`${((180 - 70) / 400) * 100}%`}
              fill={TIR_COLORS_CSS.target}
              fill-opacity="0.1"
            />

            <!-- High line (180 mg/dL) -->
            <line
              x1="0%"
              x2="100%"
              y1={`${(1 - 180 / 400) * 100}%`}
              y2={`${(1 - 180 / 400) * 100}%`}
              stroke="hsl(var(--destructive))"
              stroke-width="1"
              stroke-dasharray="5,5"
              opacity="0.7"
            />

            <!-- Low line (70 mg/dL) -->
            <line
              x1="0%"
              x2="100%"
              y1={`${(1 - 70 / 400) * 100}%`}
              y2={`${(1 - 70 / 400) * 100}%`}
              stroke="hsl(var(--destructive))"
              stroke-width="1"
              stroke-dasharray="5,5"
              opacity="0.7"
            />
          </g>

          <!-- Stacked areas -->
          {#each stackData as seriesData, i}
            {@const color = Object.values(percentileColors)[i]}
            <Area
              data={seriesData}
              line={{ stroke: color, "stroke-width": 1 }}
              fill={color}
              fillOpacity={0.7}
            />
          {/each}

          <Highlight points lines />
        </Svg>

        <Tooltip.Root>
          {#snippet children({ data: tooltipData })}
            <Tooltip.Header
              value={tooltipData.date}
              format={(date) => formatDate(date)}
            />
            <Tooltip.List>
              <Tooltip.Item
                label="Very High (90%+)"
                value={formatGlucose(1) +
                  " - " +
                  formatGlucose(tooltipData.data.high / 400) +
                  " mg/dL"}
                color={percentileColors["Very High (90-100%)"]}
              />
              <Tooltip.Item
                label="High (75-90%)"
                value={formatGlucose(tooltipData.data.p75 / 400) +
                  " - " +
                  formatGlucose(tooltipData.data.high / 400) +
                  " mg/dL"}
                color={percentileColors["High (75-90%)"]}
              />
              <Tooltip.Item
                label="Normal (25-75%)"
                value={formatGlucose(tooltipData.data.p25 / 400) +
                  " - " +
                  formatGlucose(tooltipData.data.p75 / 400) +
                  " mg/dL"}
                color={percentileColors["Normal (25-75%)"]}
              />
              <Tooltip.Item
                label="Low (10-25%)"
                value={formatGlucose(tooltipData.data.low / 400) +
                  " - " +
                  formatGlucose(tooltipData.data.p25 / 400) +
                  " mg/dL"}
                color={percentileColors["Low (10-25%)"]}
              />
              <Tooltip.Item
                label="Very Low (0-10%)"
                value={"0 - " +
                  formatGlucose(tooltipData.data.low / 400) +
                  " mg/dL"}
                color={percentileColors["Very Low (0-10%)"]}
              />
            </Tooltip.List>
          {/snippet}
        </Tooltip.Root>
      </Chart>
    </div>

    <!-- Legend -->
    <div class="mt-4 flex flex-wrap gap-4 justify-center">
      {#each Object.entries(percentileColors) as [label, color]}
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded" style="background-color: {color};"></div>
          <span class="text-sm text-muted-foreground">{label}</span>
        </div>
      {/each}
    </div>
  {:else}
    <div
      class="flex items-center justify-center h-[400px] text-muted-foreground border rounded-sm"
    >
      <div class="text-center">
        <p class="text-lg font-medium">No data available</p>
        <p class="text-sm">
          No glucose readings found for percentile visualization
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Custom styles for better visualization */
  :global(.target-lines) {
    pointer-events: none;
  }
</style>
