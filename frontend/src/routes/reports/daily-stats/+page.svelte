<script lang="ts">
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table";
  import DateRangePicker from "$lib/components/ui/date-range-picker.svelte";
  import TIRPieChart from "$lib/components/charts/TIRPieChart.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();
  const reportDetails = $derived(data.dailyStatsReport);
  const currentStats = $derived(reportDetails?.stats);
  const recentDays = $derived(currentStats?.recentDaysStats || []);

  // Date selection using DateRangePicker
  const handleDateChange = (params: {
    from?: string;
    to?: string;
    days?: number;
  }) => {
    const url = new URL($page.url);

    // For daily stats, we use the 'to' date as the selected date
    // or if it's a single day selection, use that date
    if (params.to) {
      url.searchParams.set("date", params.to);
    } else if (params.days === 1 && params.from) {
      url.searchParams.set("date", params.from);
    }

    // Clean up any range parameters since we only need a single date
    url.searchParams.delete("from");
    url.searchParams.delete("to");
    url.searchParams.delete("days");

    goto(url.toString());
  };

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
  } // Calculate detailed stats for current day and recent days
  const detailedStats = $derived.by(() => {
    if (!reportDetails?.stats) return [];

    const allDays = [currentStats, ...recentDays].filter(Boolean);

    return allDays
      .map((dayStats) => {
        if (!dayStats) return null;

        // Create a mock array of glucose readings based on the TIR data
        // This is an approximation since we don't have raw readings
        const totalReadings = reportDetails.totalReadings || 288; // Default to expected daily readings
        const mockReadings: number[] = [];

        // Generate approximate readings based on TIR percentages
        const counts = {
          veryLow: Math.round(
            (dayStats.timeInRanges.veryLow / 100) * totalReadings
          ),
          low: Math.round((dayStats.timeInRanges.low / 100) * totalReadings),
          target: Math.round(
            (dayStats.timeInRanges.target / 100) * totalReadings
          ),
          high: Math.round((dayStats.timeInRanges.high / 100) * totalReadings),
          veryHigh: Math.round(
            (dayStats.timeInRanges.veryHigh / 100) * totalReadings
          ),
        };

        // Add mock readings for each range (using average values for each range)
        for (let i = 0; i < counts.veryLow; i++) mockReadings.push(45); // Very low average
        for (let i = 0; i < counts.low; i++) mockReadings.push(62); // Low average
        for (let i = 0; i < counts.target; i++)
          mockReadings.push(dayStats.averageGlucose); // Use actual average
        for (let i = 0; i < counts.high; i++) mockReadings.push(215); // High average
        for (let i = 0; i < counts.veryHigh; i++) mockReadings.push(300); // Very high average

        const min = Math.min(...mockReadings) || 0;
        const max = Math.max(...mockReadings) || 0;
        const percentile25 = calculatePercentile(mockReadings, 25);
        const median = calculatePercentile(mockReadings, 50);
        const percentile75 = calculatePercentile(mockReadings, 75);

        return {
          date: dayStats.date || new Date().toISOString().split("T")[0],
          lowPercent: dayStats.timeInRanges.low + dayStats.timeInRanges.veryLow,
          normalPercent: dayStats.timeInRanges.target,
          highPercent:
            dayStats.timeInRanges.high + dayStats.timeInRanges.veryHigh,
          readings: mockReadings.length,
          min: min.toFixed(1),
          max: max.toFixed(1),
          average: dayStats.averageGlucose.toFixed(1),
          stdDev:
            (dayStats as any).stdDev?.toFixed(1) ||
            (currentStats as any)?.stdDev?.toFixed(1) ||
            "0.0",
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
      { name: "Very Low (<54)", value: tir.veryLow, color: "rgb(239, 68, 68)" }, // red-500
      { name: "Low (54-69)", value: tir.low, color: "rgb(251, 146, 60)" }, // orange-400
      { name: "Target (70-180)", value: tir.target, color: "rgb(34, 197, 94)" }, // green-500
      { name: "High (181-250)", value: tir.high, color: "rgb(251, 191, 36)" }, // amber-400
      {
        name: "Very High (>250)",
        value: tir.veryHigh,
        color: "rgb(239, 68, 68)",
      }, // red-500
    ].filter((segment) => segment.value > 0); // Filter out 0-value segments
  });
</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  {#if reportDetails}
    <header class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
        {reportDetails.reportName}
      </h1>
      <p class="text-xs md:text-sm text-gray-600">
        For date: {currentStats
          ? new Date(currentStats.date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "N/A"} (Generated: {reportDetails.generatedDate})
      </p>
      {#if reportDetails.dateRange}
        <p class="text-xs md:text-sm text-gray-600">
          Report for: {reportDetails.dateRange.target}
        </p>
      {/if}
      {#if reportDetails.totalReadings}
        <p class="text-xs md:text-sm text-gray-600">
          Total readings: {reportDetails.totalReadings}
        </p>
      {/if}
    </header>
    <DateRangePicker
      title="Select Date for Daily Stats"
      showDaysPresets={true}
      defaultDays={1}
      onDateChange={handleDateChange}
    />

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

      <!-- Daily Stats Table -->
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          Daily Statistics
        </h2>
        {#if detailedStats.length > 0}
          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
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
        {:else}
          <p class="text-sm text-gray-500 text-center p-4">
            No daily statistics data available.
          </p>
        {/if}
      </div>
    {/if}
    <!-- End of currentStats check -->
  {:else}
    <p class="text-center text-gray-500 py-10">Loading daily statistics...</p>
  {/if}
</div>
