<script lang="ts">
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,    TableRow,
  } from "$lib/components/ui/table";
  import TIRPieChart from "$lib/components/charts/TIRPieChart.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();
  const reportDetails = $derived(data.dailyStatsReport);
  const currentStats = $derived(reportDetails?.stats);
  const dailyData = $derived(currentStats?.recentDaysStats || []); // Renamed for clarity

  // Function to calculate percentiles
  function calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);

    if (Number.isInteger(index)) {
      return sorted[index];
    } else {
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
  } // Calculate detailed stats for current day and daily breakdown
  const detailedStats = $derived.by(() => {
    if (!reportDetails?.stats) return [];

    // For date ranges, use all the daily data
    // For single day, combine current stats with the single day data
    const allDays =
      dailyData.length > 1
        ? dailyData
        : [currentStats, ...dailyData].filter(Boolean);

    return allDays
      .map((dayStats) => {
        if (!dayStats) return null;

        // Only use actual glucose readings - no mock data
        const glucoseReadings = dayStats.glucoseReadings || [];

        // Only calculate stats if we have real glucose readings
        if (glucoseReadings.length === 0) {
          return {
            date: dayStats.date || new Date().toISOString().split("T")[0],
            lowPercent:
              dayStats.timeInRanges.low + dayStats.timeInRanges.severeLow,
            normalPercent: dayStats.timeInRanges.target,
            highPercent:
              dayStats.timeInRanges.high + dayStats.timeInRanges.severeHigh,
            readings: 0,
            min: "N/A",
            max: "N/A",
            average: dayStats.averageGlucose.toFixed(1),
            stdDev: "N/A",
            percentile25: "N/A",
            median: "N/A",
            percentile75: "N/A",
          };
        }

        const min = Math.min(...glucoseReadings);
        const max = Math.max(...glucoseReadings);
        const percentile25 = calculatePercentile(glucoseReadings, 25);
        const median = calculatePercentile(glucoseReadings, 50);
        const percentile75 = calculatePercentile(glucoseReadings, 75);

        return {
          date: dayStats.date || new Date().toISOString().split("T")[0],
          lowPercent:
            dayStats.timeInRanges.low + dayStats.timeInRanges.severeLow,
          normalPercent: dayStats.timeInRanges.target,
          highPercent:
            dayStats.timeInRanges.high + dayStats.timeInRanges.severeHigh,
          readings: glucoseReadings.length,
          min: min.toFixed(1),
          max: max.toFixed(1),
          average: dayStats.averageGlucose.toFixed(1),
          stdDev:
            (dayStats as any).stdDev?.toFixed(1) ||
            (currentStats as any)?.stdDev?.toFixed(1) ||
            "N/A",
          percentile25: percentile25.toFixed(1),
          median: median.toFixed(1),
          percentile75: percentile75.toFixed(1),
        };
      })
      .filter((stat): stat is NonNullable<typeof stat> => stat !== null);
  });
  // Pie chart data for current day TIR
  const pieChartData = $derived.by(() => {
    if (!currentStats?.timeInRanges) return [];

    const tir = currentStats.timeInRanges;
    return [
      {
        name: "Very Low (<54)",
        value: tir.severeLow,
        color: "rgb(239, 68, 68)",
      }, // red-500
      { name: "Low (54-69)", value: tir.low, color: "rgb(251, 146, 60)" }, // orange-400
      { name: "Target (70-180)", value: tir.target, color: "rgb(34, 197, 94)" }, // green-500
      { name: "High (181-250)", value: tir.high, color: "rgb(251, 191, 36)" }, // amber-400
      {
        name: "Very High (>250)",
        value: tir.severeHigh,
        color: "rgb(239, 68, 68)",
      }, // red-500
    ].filter((segment) => segment.value > 0); // Filter out 0-value segments  });
</script>

{#if reportDetails}
  {#if reportDetails.dateRange}
    <div class="text-center text-sm text-muted-foreground mb-6">
      Showing data from {reportDetails.dateRange.from} to {reportDetails.dateRange.to}
      {reportDetails.dateRange.days
        ? `(${reportDetails.dateRange.days} day${reportDetails.dateRange.days > 1 ? "s" : ""})`
        : ""}
      {#if reportDetails.totalReadings}
        • {reportDetails.totalReadings} total readings
      {/if}
    </div>
  {/if}  {/if}

  {#if reportDetails.error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <h3 class="text-red-800 font-semibold mb-2">Error Loading Data</h3>
      <p class="text-red-700">{reportDetails.error}</p>
    </div>
  {:else if !currentStats}
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h3 class="text-yellow-800 font-semibold mb-2">No Data Available</h3>
      <p class="text-yellow-700">
        No glucose data found for the selected date.
      </p>
    </div>
  {:else}
    <!-- Time in Range Pie Chart -->
    {#if pieChartData.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          Time in Range Distribution
        </h2>
          <TIRPieChart tirData={pieChartData} />
        </div>
      {/if}

      <!-- Glycemic Variability Metrics -->
      {#if currentStats?.glycemicVariability}
        <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
          <h2 class="text-xl font-semibold text-gray-700 mb-4">
            Glycemic Variability Metrics
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Basic Variability Metrics -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-gray-600 mb-2">
                Basic Metrics
              </h3>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-700">
                    Coefficient of Variation:
                  </span>
                  <span class="text-sm font-medium">
                    {currentStats.glycemicVariability.coefficientOfVariation}%
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-700">Standard Deviation:</span>
                  <span class="text-sm font-medium">
                    {currentStats.glycemicVariability.standardDeviation} mg/dL
                  </span>
                </div>
              </div>
            </div>

            <!-- Advanced Variability Metrics -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-gray-600 mb-2">
                Advanced Metrics
              </h3>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-700">MAGE:</span>
                  <span class="text-sm font-medium">
                    {currentStats.glycemicVariability
                      .meanAmplitudeGlycemicExcursions} mg/dL
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-700">CONGA (2h):</span>
                  <span class="text-sm font-medium">
                    {currentStats.glycemicVariability
                      .continuousOverlappingNetGlycemicAction} mg/dL
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-700">J-Index:</span>
                  <span class="text-sm font-medium">
                    {currentStats.glycemicVariability.jIndex}
                  </span>
                </div>
              </div>
            </div>

            <!-- Risk Indices -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-gray-600 mb-2">
                Risk Indices
              </h3>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-700">HBGI:</span>
                  <span class="text-sm font-medium text-orange-600">
                    {currentStats.glycemicVariability.highBloodGlucoseIndex}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-700">LBGI:</span>
                  <span class="text-sm font-medium text-red-600">
                    {currentStats.glycemicVariability.lowBloodGlucoseIndex}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-700">ADRR:</span>
                  <span class="text-sm font-medium">
                    {currentStats.glycemicVariability.averageDailyRiskRange}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-700">Lability Index:</span>
                  <span class="text-sm font-medium">
                    {currentStats.glycemicVariability.labilityIndex}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Metrics Explanations -->
          <div class="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 class="text-sm font-medium text-blue-800 mb-2">
              Metric Explanations:
            </h4>
            <div class="text-xs text-blue-700 space-y-1">
              <p>
                <strong>HBGI/LBGI:</strong>
                 High/Low Blood Glucose Index - risk indices for hyperglycemia and
                hypoglycemia. Lower values are better.
              </p>
              <p>
                <strong>MAGE:</strong>
                 Mean Amplitude of Glycemic Excursions - measures glucose variability
                excluding small fluctuations.
              </p>
              <p>
                <strong>CONGA:</strong>
                 Continuous Overlapping Net Glycemic Action - measures glucose variability
                over time periods.
              </p>
              <p>
                <strong>CV:</strong>
                 Coefficient of Variation - standardized measure of glucose variability.
                Target: &lt;36%
              </p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Daily Stats Table -->
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          Daily Breakdown
          {#if reportDetails?.dateRange?.days && reportDetails.dateRange.days > 1}
            ({reportDetails.dateRange.days} days)
          {/if}
        </h2>
        {#if detailedStats.length > 0}
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>TIR</TableHead>
                  <TableHead class="text-right">Low</TableHead>
                  <TableHead class="text-right">Normal</TableHead>
                  <TableHead class="text-right">High</TableHead>
                  <TableHead class="text-right">Readings</TableHead>
                  <TableHead class="text-right">Min</TableHead>
                  <TableHead class="text-right">Max</TableHead>
                  <TableHead class="text-right">Average</TableHead>
                  <TableHead class="text-right">StDev</TableHead>
                  <TableHead class="text-right">25%</TableHead>
                  <TableHead class="text-right">Median</TableHead>
                  <TableHead class="text-right">75%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each detailedStats as dayData (dayData.date)}
                  <TableRow>
                    <TableCell class="font-medium">
                      {new Date(dayData.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell class="text-right">
                      <!-- TIR visualization could be added here -->
                      {dayData.lowPercent +
                        dayData.normalPercent +
                        dayData.highPercent}%
                    </TableCell>

                    <TableCell class="text-right text-red-600">
                      {dayData.lowPercent}%
                    </TableCell>
                    <TableCell class="text-right text-green-600">
                      {dayData.normalPercent}%
                    </TableCell>
                    <TableCell class="text-right text-orange-600">
                      {dayData.highPercent}%
                    </TableCell>
                    <TableCell class="text-right">
                      {dayData.readings}
                    </TableCell>
                    <TableCell class="text-right">
                      {dayData.min}
                    </TableCell>
                    <TableCell class="text-right">
                      {dayData.max}
                    </TableCell>
                    <TableCell class="text-right font-medium">
                      {dayData.average}
                    </TableCell>
                    <TableCell class="text-right">
                      {dayData.stdDev}
                    </TableCell>
                    <TableCell class="text-right">
                      {dayData.percentile25}
                    </TableCell>
                    <TableCell class="text-right font-medium">
                      {dayData.median}
                    </TableCell>
                    <TableCell class="text-right">
                      {dayData.percentile75}
                    </TableCell>
                  </TableRow>
                {/each}
              </TableBody>
            </Table>
          </div>
        {:else}        <p class="text-sm text-gray-500 text-center p-4">
          No daily statistics data available.
        </p>
      {/if}
    </div>
  {/if}
  <!-- End of currentStats check -->
{:else}
  <p class="text-center text-gray-500 py-10">Loading daily statistics...</p>
{/if}
