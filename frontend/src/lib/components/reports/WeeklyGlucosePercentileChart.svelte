<script lang="ts">
  import { AreaChart } from "layerchart";
  import type { HourlyStats } from "$lib/calculations/types.js";

  let {
    hourlyStats,
  }: {
    hourlyStats: HourlyStats[];
  } = $props();
</script>

<div class="h-[400px] p-4 border rounded-sm">
  {#if hourlyStats.length > 0}
    <AreaChart
      data={hourlyStats}
      x={(d) => d.hour}
      y={(d) => d.median}
      renderContext="svg"
      legend
      series={[
        {
          key: "p10",
          value: [(d) => d.quartile25, (d) => d.p10],
          color: "var(--chart-1)",
          label: "P10",
        },
        {
          key: "p25",
          value: [(d) => d.median, (d) => d.quartile25],
          color: "var(--chart-2)",
        },
        {
          key: "median",
          value: [(d) => d.median, (d) => d.median],
          color: "black",
          props: {
            line: { strokeWidth: 1.75 },
          },
          label: "median",
        },
        {
          key: "quartile75",
          value: [(d) => d.median, (d) => d.quartile75],
          color: "var(--chart-3)",
          label: "quartile75",
        },
        {
          key: "p90",
          value: [(d) => d.quartile75, (d) => d.p90],
          color: "var(--chart-1)",
        },
      ]}
      xDomain={[0, 23]}
      yDomain={[0, 400]}
      seriesLayout="overlap"
      brush
      props={{
        area: { motion: { type: "tween", duration: 200 } },
        xAxis: {
          motion: { type: "tween", duration: 200 },
          tickMultiline: true,
        },
      }}
      padding={{ top: 20, right: 20, bottom: 40, left: 60 }}
    ></AreaChart>
  {:else}
    <div class="flex items-center justify-center text-muted-foreground">
      <div class="text-center">
        <p class="text-lg font-medium">No data available</p>
        <p class="text-sm">
          No glucose data found for the selected time period
        </p>
      </div>
    </div>
  {/if}
</div>
