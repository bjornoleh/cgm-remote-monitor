<script lang="ts">
  import { AreaChart } from "layerchart";
  import { TIR_COLORS_CSS } from "$lib/constants/tir-colors";

  interface HourlyPercentileData {
    hour: number;
    p10: number;
    p25: number;
    median: number;
    p75: number;
    p90: number;
  }

  let {
    data,
  }: {
    data: HourlyPercentileData[];
  } = $props();

  // Format hour for display
  function formatHour(hour: number): string {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  }

  // Format glucose value
  function formatGlucose(value: number): string {
    return Math.round(value).toString();
  }
  $inspect(data);
</script>

<div class="w-full">
  <div class="mb-4">
    <h3 class="text-lg font-semibold text-foreground">
      24-Hour Glucose Percentile Chart
    </h3>
    <p class="text-sm text-muted-foreground">
      Glucose distribution across percentiles throughout the day (similar to old Nightscout percentile chart)
    </p>
  </div>

  {#if data.length > 0}
    <div class="h-[400px] p-4 border rounded-sm">
      <AreaChart
        {data}
        x={(d) => d.hour}
        series={[
          {
            key: "p10",
            value: (d) => d.p10,
            color: "#a0a0FF",
            label: "10th-90th percentile"
          },
          {
            key: "p25", 
            value: (d) => d.p25,
            color: "#000055",
            label: "25th-75th percentile"
          },
          {
            key: "median",
            value: (d) => d.median,
            color: "#000000",
            label: "Median"
          },
          {
            key: "p75",
            value: (d) => d.p75, 
            color: "#000055",
            fillBetween: "p25"
          },
          {
            key: "p90",
            value: (d) => d.p90,
            color: "#a0a0FF", 
            fillBetween: "p10"
          }
        ]}
        xDomain={[0, 23]}
        yDomain={[0, 400]}
        xScale="linear"
        yScale="linear"
        padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
      />
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
