<script lang="ts">
  import {
    BarChart,
    Axis,
    Svg,
    Tooltip,
    Bars,
    Highlight,
    groupStackData,
  } from "layerchart";
  import * as ChartC from "$lib/components/ui/Chart/index.js";
  import testHourlyStats from "$lib/data/example-hourly-stats.json";
  interface HourlyStats {
    hour: number;
    iobType: "basalIob" | "tempIob";
  }

  interface Props {
    hourlyStats: HourlyStats[];
  }

  let { hourlyStats }: Props = $props(); // Transform data for stacked bar chart
  // Format hour for display
  function formatHour(hour: number): string {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  }
</script>

<ChartC.Container class="w-full h-80">
  {#if hourlyStats.length > 0}
    <BarChart
      legend
      data={testHourlyStats}
      x="hour"
      series={[
        {
          key: "basalIob",
          color: "var(--iob-basal)",
          label: "Basal IOB",
        },
        {
          key: "tempIob",
          color: "var(--iob-temporary)",
          label: "Temp IOB",
        },
      ]}
      props={{
        xAxis: { format: "none" },
        yAxis: { format: "metric" },
        bars: { radius: 5.0, rounded: "all" },
        tooltip: {
          header: { format: "none" },
        },
      }}
      seriesLayout="stack"
      stackPadding={5.0}
      padding={{ top: 20, right: 30, bottom: 40, left: 60 }}
    />

    <!-- Custom tooltip -->
    <!-- <Tooltip.Root
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
          </Tooltip.Root> -->
  {:else}
    <div class="flex items-center justify-center h-full text-muted-foreground">
      <div class="text-center">
        <p class="text-lg font-medium">No data available</p>
        <p class="text-sm">No insulin data found for IOB visualization</p>
      </div>
    </div>
  {/if}
</ChartC.Container>
