<script lang="ts">
  import { AreaChart } from "layerchart";
  import * as ChartC from "$lib/components/ui/chart/index.js";
  import { fromTreatments } from "$lib/calculations/iob.ts";
  import type { Treatment } from "$lib";
  import type { IOBProfile } from "$lib/calculations/types.ts";
  
  interface Props {
    treatments: Treatment[];
    intervalMinutes?: number; // Time interval in minutes (defaults to 15)
    profile?: IOBProfile; // Optional IOB profile for more accurate calculations
  }
  let { treatments, intervalMinutes = 15, profile }: Props = $props();

  // Transform treatments data to calculate actual IOB at each time interval
  let chartData = $derived.by(() => {
    // Calculate number of intervals per hour and total intervals per day
    const intervalsPerHour = 60 / intervalMinutes;
    const totalIntervals = 24 * intervalsPerHour;

    // Initialize intervals for the day
    const intervalData = Array.from({ length: totalIntervals }, (_, index) => {
      const hour = Math.floor(index / intervalsPerHour);
      const minute = (index % intervalsPerHour) * intervalMinutes;
      return {
        timeSlot: index,
        hour,
        minute,
        timeLabel: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        totalIOB: 0,
        bolusIOB: 0,
        basalIOB: 0,
      };
    });    // Calculate IOB for each time interval
    intervalData.forEach((interval) => {
      // Create a timestamp for this interval (using today's date as baseline)
      const now = new Date();
      const intervalTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                                   interval.hour, interval.minute).getTime();

      // Filter treatments that would affect IOB at this time
      // Only include treatments that occurred before this time interval
      const relevantTreatments = treatments.filter(treatment => {
        const treatmentTime = treatment.mills || new Date(treatment.created_at).getTime();
        return treatmentTime <= intervalTime;
      });

      // Calculate IOB from treatments at this specific time
      const iobResult = fromTreatments(relevantTreatments as any, profile, intervalTime);
      
      // Separate bolus IOB (from treatments) and basal IOB
      interval.bolusIOB = iobResult.iob || 0;
      interval.basalIOB = iobResult.basalIob || 0;
      interval.totalIOB = interval.bolusIOB + interval.basalIOB;
    });

    return intervalData;
  });
</script>

<ChartC.Container config={{}} class="w-full h-80">
  {#if chartData.length > 0 && chartData.some((h) => h.totalIOB > 0)}
    <AreaChart
      legend
      data={chartData}
      x="timeSlot"
      series={[
        {
          key: "bolusIOB",
          color: "var(--iob-temporary)",
          label: "Bolus IOB (U)",
        },
        {
          key: "basalIOB", 
          color: "var(--iob-basal)",
          label: "Basal IOB (U)",
        },
      ]}
      props={{
        xAxis: {
          format: (d) => {
            const index = Math.floor(d);
            if (index < 0 || index >= chartData.length) return "";
            const intervalsPerHour = 60 / intervalMinutes;
            const hour = Math.floor(index / intervalsPerHour);

            // Show labels at appropriate intervals based on time scale
            let showLabel = false;
            if (intervalMinutes <= 5) {
              // For 5-minute intervals, show every 2 hours (every 24th interval)
              showLabel = index % (intervalsPerHour * 2) === 0;
            } else if (intervalMinutes <= 15) {
              // For 15-minute intervals, show every hour (every 4th interval)
              showLabel = index % intervalsPerHour === 0;
            } else {
              // For 30+ minute intervals, show every hour
              showLabel = index % intervalsPerHour === 0;
            }

            if (showLabel) {
              return hour === 0
                ? "12 AM"
                : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                    ? "12 PM"
                    : `${hour - 12} PM`;
            }
            return "";
          },
        },
        yAxis: {
          format: "metric",
          label: "Insulin on Board (U)",
        },        tooltip: {
          header: {
            format: (d) => {
              const index = Math.floor(d);
              if (index < 0 || index >= chartData.length) return "";
              return chartData[index].timeLabel;
            },
          },
        },
      }}
      seriesLayout="stack"
      padding={{ top: 20, right: 30, bottom: 40, left: 60 }}
    />
  {:else}
    <div class="flex items-center justify-center h-full text-muted-foreground">
      <div class="text-center">
        <p class="text-lg font-medium">No IOB data available</p>
        <p class="text-sm">No insulin on board found for visualization</p>
      </div>
    </div>
  {/if}
</ChartC.Container>
