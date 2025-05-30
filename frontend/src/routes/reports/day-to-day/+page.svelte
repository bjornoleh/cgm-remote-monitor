<script lang="ts">
  import type { PageData } from "./$types";
  import { Axis, Points, ScatterChart, Svg, Tooltip } from "layerchart";
  import { Syringe, Apple, Utensils } from "lucide-svelte";
  import { scaleTime, scaleLinear, scaleThreshold } from "d3-scale";
  import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table";
  import DateRangePicker from "$lib/components/ui/date-range-picker.svelte";
  let { data }: { data: PageData } = $props();
  const reportDetails = $derived(data.dayTodayReport);
  const dailyDataPoints = $derived(reportDetails?.dailyData || []);

  // Prepare data for individual day charts
  const dailyChartData = $derived(
    dailyDataPoints.map((day) => ({
      ...day,
      chartData: day.glucoseData.map((reading) => ({
        timestamp: reading.timestamp,
        date: new Date(reading.timestamp),
        glucoseValue: reading.glucoseValue,
        timeString: reading.timeString,
        _id: reading._id,
      })),
      treatmentData: day.treatments.map((treatment) => ({
        timestamp: treatment.timestamp,
        date: new Date(treatment.timestamp),
        glucoseValue: treatment.glucoseContext || 150,
        eventType: treatment.eventType,
        insulin: treatment.insulin,
        carbs: treatment.carbs,
        protein: treatment.protein,
        fat: treatment.fat,
        notes: treatment.notes,
        _id: treatment._id,
      })),
    }))
  );

  // Helper function to format time for tooltip
  function formatTimeForTooltip(date: Date): string {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  // Calculate overall averages across all days
  const overallAverages = $derived(() => {
    if (dailyDataPoints.length === 0) return null;
    const totals = dailyDataPoints.reduce(
      (acc, day) => {
        const bolusInsulin = day.treatments
          .filter(
            (t) =>
              t.eventType &&
              (t.eventType.includes("Bolus") || (t.insulin && t.insulin > 0))
          )
          .reduce((sum, t) => sum + (t.insulin || 0), 0);

        const basalInsulin = day.treatmentSummary.totalInsulin - bolusInsulin;
        const totalDailyInsulin = day.treatmentSummary.totalInsulin;

        return {
          totalDailyInsulin: acc.totalDailyInsulin + totalDailyInsulin,
          bolusInsulin: acc.bolusInsulin + bolusInsulin,
          basalInsulin: acc.basalInsulin + basalInsulin,
          totalCarbs: acc.totalCarbs + day.treatmentSummary.totalCarbs,
          totalProtein: acc.totalProtein + day.treatmentSummary.totalProtein,
          totalFat: acc.totalFat + day.treatmentSummary.totalFat,
          timeInRange: acc.timeInRange + day.timeInRanges.target,
          tightTimeInRange:
            acc.tightTimeInRange + day.timeInRanges.tightTimeInRange,
          daysWithData: acc.daysWithData + (totalDailyInsulin > 0 ? 1 : 0),
        };
      },
      {
        totalDailyInsulin: 0,
        bolusInsulin: 0,
        basalInsulin: 0,
        totalCarbs: 0,
        totalProtein: 0,
        totalFat: 0,
        timeInRange: 0,
        tightTimeInRange: 0,
        daysWithData: 0,
      }
    );

    const daysCount = Math.max(totals.daysWithData, 1);
    const avgTotalDaily = totals.totalDailyInsulin / daysCount;
    const avgBolus = totals.bolusInsulin / daysCount;
    const avgBasal = totals.basalInsulin / daysCount;
    return {
      avgTotalDaily: avgTotalDaily,
      avgBolus: avgBolus,
      avgBasal: avgBasal,
      bolusPercentage: avgTotalDaily > 0 ? (avgBolus / avgTotalDaily) * 100 : 0,
      basalPercentage: avgTotalDaily > 0 ? (avgBasal / avgTotalDaily) * 100 : 0,
      avgCarbs: totals.totalCarbs / daysCount,
      avgProtein: totals.totalProtein / daysCount,
      avgFat: totals.totalFat / daysCount,
      avgTimeInRange: totals.timeInRange / dailyDataPoints.length,
      avgTightTimeInRange: totals.tightTimeInRange / dailyDataPoints.length,
    };
  });

  // Helper function to calculate daily insulin breakdown
  function getDailyInsulinBreakdown(day: any) {
    const bolusInsulin = day.treatments
      .filter(
        (t: any) =>
          t.eventType &&
          (t.eventType.includes("Bolus") || (t.insulin && t.insulin > 0))
      )
      .reduce((sum: number, t: any) => sum + (t.insulin || 0), 0);

    const totalDailyInsulin = day.treatmentSummary.totalInsulin;
    const basalInsulin = totalDailyInsulin - bolusInsulin;

    return {
      bolus: bolusInsulin,
      basal: basalInsulin,
      total: totalDailyInsulin,
    };
  }
  // Helper function to get glucose range color
  function getGlucoseColor(value: number): string {
    if (value < 70) return "text-red-600 font-semibold";
    if (value > 180) return "text-orange-600 font-semibold";
    return "text-green-600";
  }
</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  {#if reportDetails}
    <header class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
        {reportDetails.reportName}
      </h1>
      <p class="text-xs md:text-sm text-gray-600">
        Generated on: {reportDetails.generatedDate}
      </p>
      {#if reportDetails.dateRange}
        <p class="text-xs md:text-sm text-gray-600">
          Date Range: {reportDetails.dateRange.from} - {reportDetails.dateRange
            .to}
        </p>
      {/if}
      {#if reportDetails.totalDays && reportDetails.totalReadings}
        <p class="text-xs md:text-sm text-gray-600">
          {reportDetails.totalDays} days • {reportDetails.totalReadings} total readings
        </p>
      {/if}
    </header>

    <!-- Date Range Picker -->
    <DateRangePicker
      title="Select Date Range"
      showDaysPresets={true}
      defaultDays={7}
    />

    {#if reportDetails.error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h3 class="text-red-800 font-semibold">Error Loading Data</h3>
        <p class="text-red-600">{reportDetails.error}</p>
      </div>
    {:else if dailyDataPoints.length > 0}
      <!-- Individual Daily Charts -->
      {#each dailyChartData as dayData (dayData.date)}
        <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-4">
            {new Date(dayData.date).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            <span class="text-sm font-normal text-gray-500 ml-2">
              ({dayData.readingsCount} readings)
            </span>
          </h2>

          {#if dayData.readingsCount > 0}
            <div class="h-72 md:h-96">
              <ScatterChart
                data={dayData.chartData}
                x="timestamp"
                y="glucoseValue"
                axis="y"
                xNice
                xScale={scaleTime()}
                yScale={scaleLinear()}
                yDomain={[50, 300]}
                xDomain={[
                  new Date(dayData.date + "T00:00:00").getTime(),
                  new Date(dayData.date + "T23:59:59").getTime(),
                ]}
                c="glucoseValue"
                cScale={scaleThreshold()}
                cDomain={[70, 180]}
                cRange={["#fb2c36", "#22c55e", "#f97316"]}
                annotations={[
                  {
                    type: "line",
                    y: 180,
                    label: "High (180)",
                    props: {
                      label: { class: "text-red-500 text-xs" },
                      line: { class: "[stroke-dasharray:2,2] stroke-red-500" },
                    },
                  },
                  {
                    type: "line",
                    y: 70,
                    label: "Low (70)",
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
                    {#snippet children({ data })}
                      <Tooltip.Header>
                        {formatTimeForTooltip(data.date)}
                      </Tooltip.Header>
                      <Tooltip.List>
                        <Tooltip.Item
                          label="Glucose"
                          value="{data.glucoseValue} mg/dL"
                          class={data.glucoseValue < 70
                            ? "text-red-600 font-semibold"
                            : data.glucoseValue > 180
                              ? "text-orange-600 font-semibold"
                              : "text-green-600"}
                        />
                      </Tooltip.List>
                    {/snippet}
                  </Tooltip.Root>
                </Svg>
              </ScatterChart>
            </div>
            <!-- Daily Statistics -->
            <div class="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div class="bg-gray-50 p-3 rounded">
                <div class="text-gray-600 text-xs">Average</div>
                <div
                  class="font-semibold {getGlucoseColor(
                    dayData.averageGlucose
                  )}"
                >
                  {dayData.averageGlucose} mg/dL
                </div>
              </div>
              <div class="bg-gray-50 p-3 rounded">
                <div class="text-gray-600 text-xs">Range</div>
                <div class="font-semibold">
                  {dayData.minGlucose} - {dayData.maxGlucose}
                </div>
              </div>
              <div class="bg-gray-50 p-3 rounded">
                <div class="text-gray-600 text-xs">Time in Range</div>
                <div class="font-semibold text-green-600">
                  {dayData.timeInRanges.target}%
                </div>
              </div>
              <div class="bg-gray-50 p-3 rounded">
                <div class="text-gray-600 text-xs">Tight Time in Range</div>
                <div class="font-semibold text-blue-600">
                  {dayData.timeInRanges.tightTimeInRange}%
                </div>
                <div class="text-xs text-gray-500">70-140 mg/dL</div>
              </div>
            </div>

            <!-- Daily Insulin and Nutrition Summary -->
            {@const insulinBreakdown = getDailyInsulinBreakdown(dayData)}
            <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 class="text-sm font-semibold text-gray-700 mb-3">
                Daily Summary
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Bolus insulin:</span>
                    <span class="font-medium">
                      {insulinBreakdown.bolus.toFixed(1)}U
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Total basal insulin:</span>
                    <span class="font-medium">
                      {insulinBreakdown.basal.toFixed(1)}U
                    </span>
                  </div>
                  <div class="flex justify-between border-t pt-2">
                    <span class="text-gray-700 font-medium">
                      Total daily insulin:
                    </span>
                    <span class="font-semibold">
                      {insulinBreakdown.total.toFixed(1)}U
                    </span>
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Total carbs:</span>
                    <span class="font-medium">
                      {dayData.treatmentSummary.totalCarbs} g
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Total protein:</span>
                    <span class="font-medium">
                      {dayData.treatmentSummary.totalProtein} g
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Total fat:</span>
                    <span class="font-medium">
                      {dayData.treatmentSummary.totalFat} g
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Treatment Events for this day -->
            {#if dayData.treatmentData.length > 0}
              <div class="mt-4">
                <h4 class="text-sm font-semibold text-gray-700 mb-2">
                  Treatment Events
                </h4>
                <div class="flex flex-wrap gap-2">
                  {#each dayData.treatmentData as treatment}
                    <div
                      class="bg-blue-50 border border-blue-200 rounded px-2 py-1 text-xs"
                    >
                      <div class="font-medium">{treatment.eventType}</div>
                      <div class="text-gray-600">
                        {new Date(treatment.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {#if treatment.insulin}
                          • {treatment.insulin}U{/if}
                        {#if treatment.carbs}
                          • {treatment.carbs}g carbs{/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {:else}
            <div class="flex items-center justify-center h-32 text-gray-500">
              No glucose data available for this day
            </div>
          {/if}
        </div>
      {/each}
      <!-- Period Averages Summary -->
      {#if overallAverages()}
        {@const averages = overallAverages()}
        {#if averages}
          <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-6">
            <h2 class="text-xl font-semibold text-gray-700 mb-4">
              Period Averages
            </h2>
            <div
              class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"
            >
              <h3 class="text-sm font-semibold text-gray-700 mb-3">
                Glucose Management
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Time in Range average:</span>
                    <span class="font-semibold text-green-600">
                      {averages.avgTimeInRange.toFixed(1)}%
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">
                      Tight Time in Range average:
                    </span>
                    <span class="font-semibold text-blue-600">
                      {averages.avgTightTimeInRange.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div class="text-xs text-gray-500 space-y-1">
                  <div>TIR: 70-180 mg/dL</div>
                  <div>TTIR: 70-140 mg/dL</div>
                </div>
              </div>
            </div>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">
                Insulin & Nutrition
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-gray-600">TDD average:</span>
                    <span class="font-semibold">
                      {averages.avgTotalDaily.toFixed(1)}U
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Bolus average:</span>
                    <span class="font-medium">
                      {averages.bolusPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Basal average:</span>
                    <span class="font-medium">
                      {averages.basalPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">(Base basal average:</span>
                    <span class="font-medium">
                      {averages.basalPercentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Carbs average:</span>
                    <span class="font-medium">
                      {averages.avgCarbs.toFixed(0)}g
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Protein average:</span>
                    <span class="font-medium">
                      {averages.avgProtein.toFixed(0)}g
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Fat average:</span>
                    <span class="font-medium">
                      {averages.avgFat.toFixed(0)}g
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      {/if}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          Overall Treatment Summary
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          {#each dailyDataPoints as day}
            {#if day.treatmentSummary && (day.treatmentSummary.totalInsulin > 0 || day.treatmentSummary.totalCarbs > 0)}
              <div class="bg-gray-50 rounded-lg p-4">
                <h3 class="text-lg font-semibold text-gray-700 mb-3">
                  {new Date(day.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </h3>
                <div class="space-y-2 text-sm">
                  {#if day.treatmentSummary.totalInsulin > 0}
                    <div class="flex items-center gap-2">
                      <Syringe class="w-4 h-4 text-blue-600" />
                      <span>
                        Insulin: {day.treatmentSummary.totalInsulin.toFixed(1)}U
                      </span>
                    </div>
                  {/if}
                  {#if day.treatmentSummary.totalCarbs > 0}
                    <div class="flex items-center gap-2">
                      <Apple class="w-4 h-4 text-orange-600" />
                      <span>Carbs: {day.treatmentSummary.totalCarbs}g</span>
                    </div>
                  {/if}
                  {#if day.treatmentSummary.totalProtein > 0}
                    <div class="flex items-center gap-2">
                      <Utensils class="w-4 h-4 text-green-600" />
                      <span>Protein: {day.treatmentSummary.totalProtein}g</span>
                    </div>
                  {/if}
                  {#if day.treatmentSummary.totalFat > 0}
                    <div class="flex items-center gap-2">
                      <Utensils class="w-4 h-4 text-yellow-600" />
                      <span>Fat: {day.treatmentSummary.totalFat}g</span>
                    </div>
                  {/if}
                  <div class="text-xs text-gray-500 mt-2">
                    {day.treatmentSummary.bolusCount} bolus events •
                    {day.treatmentSummary.mealEvents} meal events
                  </div>
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>

      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Daily Summary</h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">
            Daily glucose statistics and time in range data.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[120px]">Date</TableHead>
              <TableHead>Avg (mg/dL)</TableHead>
              <TableHead>Range</TableHead>
              <TableHead>Readings</TableHead>
              <TableHead>Std Dev</TableHead>
              <TableHead>Time in Range</TableHead>
              <TableHead class="text-right">TDD (U)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each dailyDataPoints as entry (entry.date)}
              <TableRow>
                <TableCell class="font-medium">
                  {new Date(entry.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
                <TableCell class={getGlucoseColor(entry.averageGlucose)}>
                  {entry.averageGlucose || "N/A"}
                </TableCell>
                <TableCell class="text-sm">
                  {#if entry.readingsCount > 0}
                    <div>{entry.minGlucose} - {entry.maxGlucose}</div>
                  {:else}
                    N/A
                  {/if}
                </TableCell>
                <TableCell>
                  {entry.readingsCount}
                </TableCell>
                <TableCell>
                  {entry.stdDev ? `${entry.stdDev}` : "N/A"}
                </TableCell>
                <TableCell class="text-sm">
                  {#if entry.readingsCount > 0}
                    <div class="text-green-600">
                      {entry.timeInRanges.target}% Target
                    </div>
                    <div class="text-blue-600">
                      {entry.timeInRanges.tightTimeInRange}% TTIR
                    </div>
                    {#if entry.timeInRanges.low + entry.timeInRanges.severeLow > 0}
                      <div class="text-red-600">
                        {entry.timeInRanges.low + entry.timeInRanges.severeLow}%
                        Low
                      </div>
                    {/if}
                    {#if entry.timeInRanges.high + entry.timeInRanges.severeHigh > 0}
                      <div class="text-orange-600">
                        {entry.timeInRanges.high +
                          entry.timeInRanges.severeHigh}% High
                      </div>
                    {/if}
                  {:else}
                    N/A
                  {/if}
                </TableCell><TableCell class="text-right">
                  {@const insulinBreakdown = getDailyInsulinBreakdown(entry)}
                  <span class="font-medium">
                    {insulinBreakdown.total.toFixed(1)}U
                  </span>
                  <div class="text-xs text-gray-500">
                    B: {insulinBreakdown.bolus.toFixed(1)}U | Ba: {insulinBreakdown.basal.toFixed(
                      1
                    )}U
                  </div>
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {:else}
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 class="text-yellow-800 font-semibold">No Data Available</h3>
        <p class="text-yellow-600">
          No glucose data found for the selected date range. Please check your
          date selection or ensure glucose data is being uploaded to your
          Nightscout instance.
        </p>
      </div>
    {/if}
  {:else}
    <div class="flex items-center justify-center py-20">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-gray-500">Loading report details...</p>
      </div>
    </div>
  {/if}
</div>
