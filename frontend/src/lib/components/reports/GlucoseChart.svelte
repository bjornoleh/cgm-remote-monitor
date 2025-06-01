<script lang="ts">
  import { ScatterChart } from "layerchart";
  import { scaleTime, scaleThreshold } from "d3-scale";
  import type { Thresholds } from "./types";
  import type { Entry, Treatment } from "$lib";
  import { TIR_COLORS_CSS } from "$lib/constants";
  import * as Chart from "$lib/components/ui/chart/index.js";

  interface Props {
    entries: Entry[];
    treatments: Treatment[];
    date: string; // YYYY-MM-DD
    thresholds: Thresholds;
  }

  let { entries, treatments, date, thresholds }: Props = $props();
  // Combine entries and treatments into chart data
  const chartData = $derived(() => {
    const data: any[] = [];

    // Add glucose entries
    for (const entry of entries) {
      if (entry.sgv || entry.mgdl) {
        data.push({
          timestamp: entry.date,
          glucoseValue: entry.sgv || entry.mgdl || 0,
          _id: entry._id,
          type: "glucose" as const,
        });
      }
    }

    // Add treatments
    for (const treatment of treatments) {
      const timestamp = new Date(treatment.timestamp).getTime();
      data.push({
        timestamp,
        glucoseValue: 0, // Treatments don't have glucose values, will be positioned at bottom
        _id: treatment._id,
        type: "treatment" as const,
        eventType: treatment.eventType,
        insulin: treatment.insulin,
        carbs: treatment.carbs,
        notes: treatment.notes,
      });
    }

    return data.sort((a, b) => a.timestamp - b.timestamp);
  });
  const xScale = $derived(
    scaleTime().domain([
      new Date(date + "T00:00:00").getTime(),
      new Date(date + "T23:59:59").getTime(),
    ])
  );

  const chartConfig = {
    glucose: {},
  } satisfies Chart.ChartConfig;
</script>

<Chart.Container config={chartConfig} class="h-72 md:h-96">
  <ScatterChart
    data={chartData()}
    x="timestamp"
    y="glucoseValue"
    c="glucoseValue"
    yBaseline={0}
    axis="y"
    {xScale}
    cScale={scaleThreshold()}
    tooltip={{
      mode: "bisect-y",
    }}
    cDomain={[
      thresholds.bgLow,
      thresholds.bgTargetBottom,
      thresholds.bgTargetTop,
      thresholds.bgHigh,
    ]}
    cRange={[
      TIR_COLORS_CSS.severeLow,
      TIR_COLORS_CSS.low,
      TIR_COLORS_CSS.target,
      TIR_COLORS_CSS.high,
      TIR_COLORS_CSS.severeHigh,
    ]}
    annotations={[
      {
        type: "line",
        y: thresholds.bgHigh,
        label: `High (${thresholds.bgHigh})`,
        props: {
          label: { class: "text-xs" },
          line: {
            class: "[stroke-dasharray:2,2] stroke-high-bg",
            color: "var(--high-bg)",
          },
        },
      },
      {
        type: "line",
        y: thresholds.bgLow,
        label: `Low (${thresholds.bgLow})`,
        props: {
          label: { class: "text-xs" },
          line: { class: "[stroke-dasharray:2,2] stroke-low-bg" },
        },
      },
    ]}
    padding={{ top: 20, right: 30, bottom: 40, left: 50 }}
  >
    <!-- <Svg>
      <Axis placement="left" grid rule />
      <Axis placement="bottom" rule />
      <Points r={3} class="stroke-surface-content/50" />
      <Highlight points lines />
    </Svg>
    <Tooltip.Root class="bg-popover">
      {#snippet children({ data })}
        <Tooltip.Header>
          {formatTimeForTooltip(new Date(data.timestamp))}
        </Tooltip.Header>
        <Tooltip.List>
          <Tooltip.Item label="value" value={data.glucoseValue} />
        </Tooltip.List>
      {/snippet}
    </Tooltip.Root> -->
  </ScatterChart>
</Chart.Container>
