<script lang="ts">
  import { Chart, Axis, Svg, Tooltip, Bars, Highlight } from "layerchart";
  import testHourlyStats from "$lib/data/example-hourly-stats.json";
  interface HourlyStats {
    hour: number;
    basalIob: number;
    tempIob: number;
  }

  interface Props {
    hourlyStats: HourlyStats[];
  }

  let { hourlyStats }: Props = $props(); // Transform data for stacked bar chart
  const chartData = $derived.by(() => {
    const stackedData = [];

    for (const stats of testHourlyStats) {
      const basalIob = stats.basalIob || 0;
      const tempIob = stats.tempIob || 0;
      const totalIob = basalIob + tempIob;

      // Create entry for basal IOB (bottom of stack)
      stackedData.push({
        hour: stats.hour,
        iobType: "basalIob",
        value: basalIob,
        values: [0, basalIob],
        data: [
          { hour: stats.hour, iobType: "basalIob", value: basalIob },
          { hour: stats.hour, iobType: "tempIob", value: tempIob },
        ],
      });

      // Create entry for temp IOB (top of stack)
      stackedData.push({
        hour: stats.hour,
        iobType: "tempIob",
        value: tempIob,
        values: [basalIob, totalIob],
        data: [
          { hour: stats.hour, iobType: "basalIob", value: basalIob },
          { hour: stats.hour, iobType: "tempIob", value: tempIob },
        ],
      });
    }

    return stackedData;
  });

  // Format hour for display
  function formatHour(hour: number): string {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  }
  // Calculate Y domain based on max IOB
  const yDomain = $derived.by(() => {
    if (chartData.length === 0) return [0, 2];

    const maxIob = Math.max(...chartData.map((d) => Math.max(...d.values)));
    return [0, Math.max(2, maxIob * 1.1)]; // Add 10% padding
  });

  // Colors for stacked bars
  const basalColor = "red";
  const tempColor = "green";
  $inspect({
    chartData,
    yDomain,
    basalColor,
    tempColor,
  });
</script>

<div class="w-full h-80">
  {#if chartData.length > 0}
    <Chart
      data={chartData}
      x="hour"
      y="values"
      c="iobType"
      cDomain={["basalIob", "tempIob"]}
      cRange={[basalColor, tempColor]}
      {yDomain}
      xDomain={[0, 23]}
      padding={{ top: 20, right: 30, bottom: 60, left: 60 }}
    >
      {#snippet children({ context })}
        <Svg>
          <Axis placement="left" rule grid label="Insulin on Board (U)" />
          <Axis
            placement="bottom"
            rule
            label="Hour of Day"
            format={formatHour}
            ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
          />

          <Bars strokeWidth={1} />
          <Highlight area />
          <!-- Custom tooltip -->
          <Tooltip.Root
            class="bg-popover text-popover-foreground p-3 rounded-md shadow-lg border"
          >
            {#snippet children({ data })}
              <div class="space-y-2">
                <div class="font-semibold">{formatHour(data.hour)}</div>
                <div class="space-y-1 text-sm">
                  {#each data.data as iobData}
                    <div class="flex justify-between items-center">
                      <div class="flex items-center gap-2">
                        <div
                          class="w-3 h-3 rounded"
                          style="background-color: {iobData.iobType ===
                          'basalIob'
                            ? basalColor
                            : tempColor}"
                        ></div>
                        <span>
                          {iobData.iobType === "basalIob"
                            ? "Basal IOB:"
                            : "Temp IOB:"}
                        </span>
                      </div>
                      <span class="font-medium">
                        {iobData.value.toFixed(2)}U
                      </span>
                    </div>
                  {/each}
                  <div
                    class="border-t pt-1 flex justify-between items-center font-medium"
                  >
                    <span>Total IOB:</span>
                    <span>
                      {(data.data[0].value + data.data[1].value).toFixed(2)}U
                    </span>
                  </div>
                </div>
              </div>
            {/snippet}
          </Tooltip.Root>
        </Svg>
      {/snippet}
    </Chart>

    <!-- Legend -->
    <div class="flex justify-center gap-6 mt-4 text-sm">
      <div class="flex items-center gap-2">
        <div
          class="w-4 h-4 rounded"
          style="background-color: {basalColor}; opacity: 0.8;"
        ></div>
        <span>Basal IOB</span>
      </div>
      <div class="flex items-center gap-2">
        <div
          class="w-4 h-4 rounded"
          style="background-color: {tempColor}; opacity: 0.8;"
        ></div>
        <span>Temporary IOB</span>
      </div>
    </div>
  {:else}
    <div class="flex items-center justify-center h-full text-muted-foreground">
      <div class="text-center">
        <p class="text-lg font-medium">No data available</p>
        <p class="text-sm">No insulin data found for IOB visualization</p>
      </div>
    </div>
  {/if}
</div>
