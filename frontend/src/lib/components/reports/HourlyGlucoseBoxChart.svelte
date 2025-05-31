<script lang="ts">
  import { Chart, Axis, Svg, Tooltip, Line, Rect, Group } from "layerchart";

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
  const yDomain: [number, number] = $derived.by(() => {
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
        <!-- Y-axis with glucose threshold Lines -->
        <Axis placement="left" rule grid label="Glucose (mg/dL)" />
        <Axis
          placement="bottom"
          rule
          label="Hour of Day"
          format={formatHour}
          ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
        />
        <!-- Target range background -->
        <Group class="target-ranges">
          <!-- Target range (70-180) -->
          <Rect
            x={-0.5}
            y={70}
            width={24}
            height={110}
            fill="hsl(var(--success))"
            fill-opacity="0.1"
          />
          <!-- High Line (180) -->
          <Line
            x1="0%"
            x2="100%"
            y1={180}
            y2={180}
            stroke="hsl(var(--destructive))"
            stroke-width="1"
            stroke-dasharray="5,5"
            opacity={0.7}
          />

          <!-- Low line (70) -->
          <Line
            x1="0%"
            x2="100%"
            y1={70}
            y2={70}
            stroke="hsl(var(--destructive))"
            stroke-width="1"
            stroke-dasharray="5,5"
            opacity={0.7}
          />
        </Group>
        <!-- Custom box plots -->
        <Group class="box-plots">
          {#each chartData as data}
            {@const boxWidth = 0.8}
            {@const xPosition = (data.hour / 23) * 100}
            {@const boxWidthPercent = (boxWidth / 24) * 100}

            <!-- Box (IQR) -->
            <Rect
              x={`${xPosition - boxWidthPercent / 2}%`}
              y={data.q1}
              width={`${boxWidthPercent}%`}
              height={data.q3 - data.q1}
              fill="hsl(var(--primary))"
              fill-opacity="0.3"
              stroke="hsl(var(--primary))"
              stroke-width="2"
            />

            <!-- Median line -->
            <Line
              x1={`${xPosition - boxWidthPercent / 2}%`}
              x2={`${xPosition + boxWidthPercent / 2}%`}
              y1={data.median}
              y2={data.median}
              stroke="hsl(var(--primary))"
              stroke-width="3"
            />

            <!-- Upper whisker -->
            <Line
              x1={`${xPosition}%`}
              x2={`${xPosition}%`}
              y1={data.q3}
              y2={data.max}
              stroke="hsl(var(--primary))"
              stroke-width="1"
            />

            <!-- Lower whisker -->
            <Line
              x1={`${xPosition}%`}
              x2={`${xPosition}%`}
              y1={data.q1}
              y2={data.min}
              stroke="hsl(var(--primary))"
              stroke-width="1"
            />

            <!-- Whisker caps -->
            <Line
              x1={`${xPosition - 1.5}%`}
              x2={`${xPosition + 1.5}%`}
              y1={data.max}
              y2={data.max}
              stroke="hsl(var(--primary))"
              stroke-width="1"
            />

            <Line
              x1={`${xPosition - 1.5}%`}
              x2={`${xPosition + 1.5}%`}
              y1={data.min}
              y2={data.min}
              stroke="hsl(var(--primary))"
              stroke-width="1"
            />

            <!-- Outliers -->
            {#each data.outliers as outlier}
              <circle
                cx={`${xPosition}%`}
                cy={outlier}
                r="2"
                fill="hsl(var(--destructive))"
                stroke="hsl(var(--destructive))"
                stroke-width="1"
              />
            {/each}
          {/each}
        </Group>

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

  :global(.box-plots Rect:hover) {
    fill-opacity: 0.5;
  }

  :global(.box-plots Line:hover) {
    stroke-width: 2;
  }
</style>
