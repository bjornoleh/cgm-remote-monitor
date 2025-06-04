<script lang="ts">
  import * as ChartC from "$lib/components/ui/chart/index.js";
  import type { TimeInRangeMetrics } from "$lib/utils/glucose-analytics";
  import { scaleBand } from "d3";
  import { BarChart } from "layerchart";
  let { data }: { data: TimeInRangeMetrics } = $props();
</script>

<ChartC.Container config={{}} class="h-72 md:h-96 p-4 border rounded-sm">
  <BarChart
    data={[data.percentages]}
    yDomain={[0, 100]}
    xScale={scaleBand().paddingInner(0.4).paddingOuter(0.1)}
    yNice={4}
    series={[
      {
        key: "severeLow",
        color: "var(--severe-low-bg)",
        label: "Severe Low",
      },
      {
        key: "low",
        color: "var(--low-bg)",
        label: "Low",
      },
      {
        key: "target",
        color: "var(--target-bg)",
        label: "Target",
      },
      {
        key: "high",
        color: "var(--high-bg)",
        label: "High",
      },
      {
        key: "severeHigh",
        color: "var(--severe-high-bg)",
        label: "Severe High",
      },
    ]}
    legend
    seriesLayout="stack"
    props={{
      bars: {
        motion: { type: "tween", duration: 200 },
      },
      tooltip: {
        header: {},
      },
      xAxis: {
        hidden: true,
      },
      yAxis: {
        hidden: true,
      },
    }}
  />
</ChartC.Container>
