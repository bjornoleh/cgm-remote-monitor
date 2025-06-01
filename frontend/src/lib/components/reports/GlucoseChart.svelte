<script lang="ts">
  import {
    Axis,
    Bar,
    BarChart,
    Points,
    ScatterChart,
    Svg,
    Tooltip,
  } from "layerchart";
  import { scaleTime, scaleThreshold, scaleLinear } from "d3-scale";
  import type { Thresholds } from "./types";
  import type { Sgv, Treatment } from "$lib";
  import { TIR_COLORS_CSS } from "$lib/constants";
  import * as Chart from "$lib/components/ui/chart/index.js";

  interface Props {
    entries: Sgv[];
    treatments: Treatment[];
    date: string; // YYYY-MM-DD
    thresholds: Thresholds;
  }
  let { entries, treatments, date, thresholds }: Props = $props();

  const insulinToCarbRatio = 12; // Hardcoded ratio

  // Create D3 scale for insulin to carb ratio
  const insulinScale = scaleLinear()
    .domain([0, 1]) // 1 unit of insulin
    .range([0, insulinToCarbRatio]); // maps to 12 carbs

  // Scale insulin values by the insulin-to-carb ratio using D3 scale
  const scaledTreatments = $derived(
    treatments.map((treatment) => ({
      ...treatment,
      insulin: treatment.insulin
        ? insulinScale(treatment.insulin)
        : treatment.insulin,
    }))
  );

  const xScale = $derived(
    scaleTime().domain([
      new Date(date + "T00:00:00").getTime(),
      new Date(date + "T23:59:59").getTime(),
    ])
  );
  $inspect(entries, treatments);
</script>

<div class="h-72 md:h-96 grid grid-stack">
  <!-- <BarChart
    data={scaledTreatments}
    x="mills"
    y={["carbs", "insulin"]}
    yScale={scaleLinear().domain([0, 100]).range([0, insulinToCarbRatio])}
    renderContext={"svg"}
    props={{
      xAxis: {
        hidden: true,
      },
      yAxis: {
        placement: "right",
      },
    }}
    legend
    series={[
      {
        key: "carbs",
        color: "var(--carbs)",
        label: "Carbs",
        props: { fillOpacity: 0.5 },
      },
      {
        key: "insulin",
        color: "var(--insulin)",
        label: `Insulin`,
        props: { insets: { x: 6 } },
      },
    ]}
    padding={{ top: 20, right: 30, bottom: 40, left: 50 }}
  ></BarChart> -->
  <ScatterChart
    data={[entries, ...scaledTreatments]}
    x="mills"
    y={["sgv", "carbs", "insulin"]}
    c="sgv"
    yBaseline={0}
    axis="y"
    legend
    {xScale}
    cScale={scaleThreshold()}
    props={{
      points: {
        r: 3,
      },
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
    <Svg>
      <Axis placement="left" grid rule />
      <Axis placement="bottom" rule />
      <Points x={"mills"} y={"sgv"} r={3} />
      <Bar x={"mills"} y={"carbs"} data={scaledTreatments} />
      <Bar x={"mills"} y={"insulin"} data={scaledTreatments} />
      {#snippet tooltip({ context })}
        <Tooltip.Root {context}>
          {#snippet children({ data })}
            <Tooltip.Header value={data.date} format="time" />
            <Tooltip.List>
              <Tooltip.Item label="BG" value={data?.sgv} />
              <Tooltip.Item label="Carbs (g)" value={data?.carbs} />
              <Tooltip.Item
                label="Insulin"
                value={data?.insulin || 0 / insulinToCarbRatio}
              />
            </Tooltip.List>
          {/snippet}
        </Tooltip.Root>
      {/snippet}
    </Svg>
  </ScatterChart>
</div>
