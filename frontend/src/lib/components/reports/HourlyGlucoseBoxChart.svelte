<script lang="ts">
  import { Chart, Axis, Svg, Tooltip } from "layerchart";

  interface HourlyBoxPlotData {
    hour: number;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    outliers: number[];
  }

  interface Props {
    boxPlotData: HourlyBoxPlotData[];
  }

  let { boxPlotData }: Props = $props();

  // Transform data for LayerChart
  const chartData = $derived.by(() => {
    return boxPlotData.map((data) => ({
      hour: data.hour,
      min: data.min,
      q1: data.q1,
      median: data.median,
      q3: data.q3,
      max: data.max,
      outliers: data.outliers,
      // For box plot visualization
      lowerWhisker: data.min,
      upperWhisker: data.max,
      boxHeight: data.q3 - data.q1,
      boxCenter: (data.q1 + data.q3) / 2,
    }));
  });

  // Format hour for display
  function formatHour(hour: number): string {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  }

  // Define Y domain based on data
  const yDomain = $derived.by(() => {
    if (chartData.length === 0) return [0, 400];

    const allValues = chartData
      .flatMap((d) => [d.min, d.max, ...d.outliers])
      .filter((v) => v > 0);

    if (allValues.length === 0) return [0, 400];

    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const padding = (maxVal - minVal) * 0.1;

    return [Math.max(0, minVal - padding), maxVal + padding];
  });
</script>

<div class="w-full h-96">
  {#if chartData.length > 0}
    <Chart
      data={chartData}
      x="hour"
      y="median"
      {yDomain}
      xDomain={[0, 23]}
      padding={{ top: 20, right: 30, bottom: 60, left: 60 }}
    >
      <Svg>
        <!-- Y-axis with glucose threshold lines -->
        <Axis placement="left" rule grid label="Glucose (mg/dL)" />
        <Axis
          placement="bottom"
          rule
          label="Hour of Day"
          format={formatHour}
          ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
        />

        <!-- Target range background -->
        <g class="target-ranges">
          <!-- Target range (70-180) -->
          <rect
            x="0"
            y={`calc(100% - ${((180 - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
            width="100%"
            height={`${((180 - 70) / (yDomain[1] - yDomain[0])) * 100}%`}
            fill="hsl(var(--success))"
            fill-opacity="0.1"
          />

          <!-- High line (180) -->
          <line
            x1="0"
            x2="100%"
            y1={`calc(100% - ${((180 - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
            y2={`calc(100% - ${((180 - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
            stroke="hsl(var(--destructive))"
            stroke-width="1"
            stroke-dasharray="5,5"
            opacity="0.7"
          />

          <!-- Low line (70) -->
          <line
            x1="0"
            x2="100%"
            y1={`calc(100% - ${((70 - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
            y2={`calc(100% - ${((70 - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
            stroke="hsl(var(--destructive))"
            stroke-width="1"
            stroke-dasharray="5,5"
            opacity="0.7"
          />
        </g>

        <!-- Custom box plots -->
        <g class="box-plots">
          {#each chartData as data}
            {@const xPos = (data.hour / 23) * 100}
            {@const boxWidth = 2}

            <!-- Box (IQR) -->
            <rect
              x={`calc(${xPos}% - ${boxWidth / 2}%)`}
              y={`calc(100% - ${((data.q3 - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
              width={`${boxWidth}%`}
              height={`${((data.q3 - data.q1) / (yDomain[1] - yDomain[0])) * 100}%`}
              fill="hsl(var(--primary))"
              fill-opacity="0.3"
              stroke="hsl(var(--primary))"
              stroke-width="2"
            />

            <!-- Median line -->
            <line
              x1={`calc(${xPos}% - ${boxWidth / 2}%)`}
              x2={`calc(${xPos}% + ${boxWidth / 2}%)`}
              y1={`calc(100% - ${((data.median - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
              y2={`calc(100% - ${((data.median - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
              stroke="hsl(var(--primary))"
              stroke-width="3"
            />

            <!-- Upper whisker -->
            <line
              x1={`${xPos}%`}
              x2={`${xPos}%`}
              y1={`calc(100% - ${((data.q3 - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
              y2={`calc(100% - ${((data.max - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
              stroke="hsl(var(--primary))"
              stroke-width="1"
            />

            <!-- Lower whisker -->
            <line
              x1={`${xPos}%`}
              x2={`${xPos}%`}
              y1={`calc(100% - ${((data.q1 - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
              y2={`calc(100% - ${((data.min - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
              stroke="hsl(var(--primary))"
              stroke-width="1"
            />

            <!-- Whisker caps -->
            <line
              x1={`calc(${xPos}% - 0.5%)`}
              x2={`calc(${xPos}% + 0.5%)`}
              y1={`calc(100% - ${((data.max - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
              y2={`calc(100% - ${((data.max - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
              stroke="hsl(var(--primary))"
              stroke-width="1"
            />

            <line
              x1={`calc(${xPos}% - 0.5%)`}
              x2={`calc(${xPos}% + 0.5%)`}
              y1={`calc(100% - ${((data.min - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
              y2={`calc(100% - ${((data.min - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
              stroke="hsl(var(--primary))"
              stroke-width="1"
            />

            <!-- Outliers -->
            {#each data.outliers as outlier}
              <circle
                cx={`${xPos}%`}
                cy={`calc(100% - ${((outlier - yDomain[0]) / (yDomain[1] - yDomain[0])) * 100}%)`}
                r="2"
                fill="hsl(var(--destructive))"
                stroke="hsl(var(--destructive))"
                stroke-width="1"
              />
            {/each}
          {/each}
        </g>

        <!-- Tooltip -->
        <Tooltip.Root
          class="bg-popover text-popover-foreground p-3 rounded-md shadow-lg border"
        >
          {#snippet children({ data })}
            <div class="space-y-1">
              <div class="font-semibold">{formatHour(data.hour)}</div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <div>Max: {data.max.toFixed(0)}</div>
                <div>Q3: {data.q3.toFixed(0)}</div>
                <div>Median: {data.median.toFixed(0)}</div>
                <div>Q1: {data.q1.toFixed(0)}</div>
                <div>Min: {data.min.toFixed(0)}</div>
                {#if data.outliers.length > 0}
                  <div class="col-span-2">Outliers: {data.outliers.length}</div>
                {/if}
              </div>
            </div>
          {/snippet}
        </Tooltip.Root>
      </Svg>
    </Chart>
  {:else}
    <div class="flex items-center justify-center h-full text-muted-foreground">
      <div class="text-center">
        <p class="text-lg font-medium">No data available</p>
        <p class="text-sm">
          No glucose readings found for box plot visualization
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Custom styles for better visualization */
  :global(.target-ranges) {
    pointer-events: none;
  }

  :global(.box-plots rect:hover) {
    fill-opacity: 0.5;
  }

  :global(.box-plots line:hover) {
    stroke-width: 2;
  }
</style>
