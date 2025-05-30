<script lang="ts">
  import { Axis, Points, ScatterChart, Svg, Tooltip } from "layerchart";
  import { scaleTime, scaleLinear, scaleThreshold } from "d3-scale";
  import type { Thresholds, ChartDataItem } from "./types";

  interface Props {
    chartData: ChartDataItem[];
    date: string; // YYYY-MM-DD
    thresholds: Thresholds;
  }

  let { chartData, date, thresholds }: Props = $props();

  // Helper function to format time for tooltip
  function formatTimeForTooltip(d: Date): string {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  const chartWidth = 800;
  const chartHeight = 300;
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };

  const xScale = $derived(
    scaleTime()
      .domain([
        new Date(date + "T00:00:00").getTime(),
        new Date(date + "T23:59:59").getTime(),
      ])
      .range([margin.left, chartWidth - margin.right])
  );

  const yScale = $derived(
    scaleLinear()
      .domain([40, Math.max(400, thresholds.bgHigh + 120)]) // Ensure y-axis accommodates high values
      .range([chartHeight - margin.bottom, margin.top])
  );

  const colorScale = $derived(
    scaleThreshold<number, string>()
      .domain([thresholds.bgLow, thresholds.bgHigh, 250]) // 250 is an example for very high, adjust if needed
      .range(["#dc2626", "#16a34a", "#ea580c", "#dc2626"]) // red, green, orange, red
  );
</script>

<div class="h-72 md:h-96">
  <ScatterChart
    data={chartData}
    x="timestamp"
    y="glucoseValue"
    axis="y"
    xNice
    {xScale}
    {yScale}
    c="glucoseValue"
    cScale={colorScale}
    annotations={[
      {
        type: "line",
        y: thresholds.bgHigh,
        label: `High (${thresholds.bgHigh})`,
        props: {
          label: { class: "text-red-500 text-xs" },
          line: { class: "[stroke-dasharray:2,2] stroke-red-500" },
        },
      },
      {
        type: "line",
        y: thresholds.bgLow,
        label: `Low (${thresholds.bgLow})`,
        props: {
          label: { class: "text-red-500 text-xs" },
          line: { class: "[stroke-dasharray:2,2] stroke-red-500" },
        },
      },
    ]}
    padding={{ top: 20, right: 30, bottom: 40, left: 50 }}
  >
    <Svg>
      <Points r={3} />
      <Axis placement="left" grid rule />
      <Axis
        placement="bottom"
        rule
        format={(d) =>
          new Date(d).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
      />
      <Tooltip.Root
        class="text-sm p-3 bg-white border rounded-lg shadow-lg max-w-xs"
      >
        {#snippet children({ data: tooltipData })}
          <Tooltip.Header>
            <!-- Ensure tooltipData.date is a Date object or convert from timestamp -->
            {formatTimeForTooltip(new Date(tooltipData.timestamp))}
          </Tooltip.Header>
          <Tooltip.List>
            <Tooltip.Item
              label="Glucose"
              value="{tooltipData.glucoseValue} mg/dL"
              class={tooltipData.glucoseValue < thresholds.bgLow
                ? "text-red-600 font-semibold"
                : tooltipData.glucoseValue > thresholds.bgHigh
                  ? "text-orange-600 font-semibold"
                  : "text-green-600"}
            />
          </Tooltip.List>
        {/snippet}
      </Tooltip.Root>
    </Svg>
  </ScatterChart>
</div>
