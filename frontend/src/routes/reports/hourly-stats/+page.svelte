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
  import HourlyGlucoseBoxChart from "$lib/components/reports/HourlyGlucoseBoxChart.svelte";
  import HourlyIOBChart from "$lib/components/reports/HourlyIOBChart.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const reportData = $derived(data.success ? data.data : null);
  const hourlyStats = $derived(reportData?.hourlyStats || []);
  const boxPlotData = $derived(reportData?.boxPlotData || []);
  const dateRange = $derived(reportData?.dateRange);

  // Date selection using DateRangePicker
  const handleDateChange = (params: {
    from?: string;
    to?: string;
    days?: number;
  }) => {
    const url = new URL($page.url);

    if (params.from && params.to) {
      url.searchParams.set("from", params.from);
      url.searchParams.set("to", params.to);
      url.searchParams.delete("days");
    } else if (params.days) {
      url.searchParams.set("days", params.days.toString());
      url.searchParams.delete("from");
      url.searchParams.delete("to");
    }

    goto(url.toString());
  };

  // Format hour for display (24-hour to 12-hour format)
  function formatHour(hour: number): string {
    if (hour === 0) return "12:00 AM";
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return "12:00 PM";
    return `${hour - 12}:00 PM`;
  }

  // Format numbers with appropriate precision
  function formatNumber(value: number): string {
    if (value === 0) return "—";
    if (value < 10) return value.toFixed(1);
    return Math.round(value).toString();
  }

  // Calculate summary statistics
  const summaryStats = $derived.by(() => {
    const allReadings = hourlyStats
      .flatMap((h) => h.glucoseValues)
      .filter((v) => v > 0);
    if (allReadings.length === 0) {
      return {
        totalReadings: 0,
        overallAverage: 0,
        highestHour: null,
        lowestHour: null,
      };
    }

    const average =
      allReadings.reduce((sum, val) => sum + val, 0) / allReadings.length;

    // Find hour with highest and lowest average glucose
    const hoursWithData = hourlyStats.filter((h) => h.readingsCount > 0);
    const highestHour = hoursWithData.reduce(
      (max, hour) => (hour.average > max.average ? hour : max),
      hoursWithData[0]
    );
    const lowestHour = hoursWithData.reduce(
      (min, hour) => (hour.average < min.average ? hour : min),
      hoursWithData[0]
    );

    return {
      totalReadings: allReadings.length,
      overallAverage: Math.round(average),
      highestHour: highestHour
        ? { hour: highestHour.hour, average: highestHour.average }
        : null,
      lowestHour: lowestHour
        ? { hour: lowestHour.hour, average: lowestHour.average }
        : null,
    };
  });
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4">
    <h1 class="text-3xl font-bold">Hourly Statistics Report</h1>

    <!-- Date Range Picker -->
    <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <DateRangePicker onDateChange={handleDateChange} />

      {#if dateRange}
        <div class="text-sm text-muted-foreground">
          {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
        </div>
      {/if}
    </div>
  </div>

  <!-- Error State -->
  {#if !data.success}
    <div
      class="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg"
    >
      <h3 class="font-semibold">Error loading data</h3>
      <p>{data.error || "Unknown error occurred"}</p>
    </div>
  {:else if hourlyStats.length === 0}
    <div
      class="bg-muted/50 border border-muted text-muted-foreground p-4 rounded-lg"
    >
      <h3 class="font-semibold">No data available</h3>
      <p>No glucose readings found for the selected date range.</p>
    </div>
  {:else}
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-card text-card-foreground p-4 rounded-lg border">
        <h3 class="text-sm font-medium text-muted-foreground">
          Total Readings
        </h3>
        <p class="text-2xl font-bold">
          {summaryStats.totalReadings.toLocaleString()}
        </p>
      </div>

      <div class="bg-card text-card-foreground p-4 rounded-lg border">
        <h3 class="text-sm font-medium text-muted-foreground">
          Overall Average
        </h3>
        <p class="text-2xl font-bold">{summaryStats.overallAverage} mg/dL</p>
      </div>

      {#if summaryStats.highestHour}
        <div class="bg-card text-card-foreground p-4 rounded-lg border">
          <h3 class="text-sm font-medium text-muted-foreground">
            Highest Hour
          </h3>
          <p class="text-2xl font-bold">
            {formatHour(summaryStats.highestHour.hour)}
          </p>
          <p class="text-sm text-muted-foreground">
            {formatNumber(summaryStats.highestHour.average)} mg/dL avg
          </p>
        </div>
      {/if}

      {#if summaryStats.lowestHour}
        <div class="bg-card text-card-foreground p-4 rounded-lg border">
          <h3 class="text-sm font-medium text-muted-foreground">Lowest Hour</h3>
          <p class="text-2xl font-bold">
            {formatHour(summaryStats.lowestHour.hour)}
          </p>
          <p class="text-sm text-muted-foreground">
            {formatNumber(summaryStats.lowestHour.average)} mg/dL avg
          </p>
        </div>
      {/if}
    </div>

    <!-- Charts Section -->
    <div class="space-y-6">
      <!-- Glucose Box Chart -->
      <div class="bg-card text-card-foreground p-6 rounded-lg border">
        <h2 class="text-xl font-semibold mb-4">Hourly Glucose Distribution</h2>
        <!-- <HourlyGlucoseBoxChart {boxPlotData} /> -->
      </div>

      <!-- IOB Chart -->
      <div class="bg-card text-card-foreground p-6 rounded-lg border">
        <h2 class="text-xl font-semibold mb-4">Hourly Insulin-on-Board</h2>
        <HourlyIOBChart {hourlyStats} />
      </div>
    </div>

    <!-- Statistics Table -->
    <div class="bg-card text-card-foreground rounded-lg border">
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold">Hourly Statistics</h2>
        <p class="text-sm text-muted-foreground mt-1">
          Detailed breakdown of glucose readings and insulin activity by hour
        </p>
      </div>

      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[100px]">Time</TableHead>
              <TableHead class="text-right">Readings</TableHead>
              <TableHead class="text-right">Average</TableHead>
              <TableHead class="text-right">Min</TableHead>
              <TableHead class="text-right">Q1</TableHead>
              <TableHead class="text-right">Median</TableHead>
              <TableHead class="text-right">Q3</TableHead>
              <TableHead class="text-right">Max</TableHead>
              <TableHead class="text-right">Std Dev</TableHead>
              <TableHead class="text-right">Basal IOB</TableHead>
              <TableHead class="text-right">Temp IOB</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each hourlyStats as stats}
              <TableRow class="hover:bg-muted/50">
                <TableCell class="font-medium">
                  {formatHour(stats.hour)}
                </TableCell>
                <TableCell class="text-right">
                  {stats.readingsCount > 0 ? stats.readingsCount : "—"}
                </TableCell>
                <TableCell class="text-right">
                  {formatNumber(stats.average)}
                </TableCell>
                <TableCell class="text-right">
                  {formatNumber(stats.min)}
                </TableCell>
                <TableCell class="text-right">
                  {formatNumber(stats.quartile25)}
                </TableCell>
                <TableCell class="text-right">
                  {formatNumber(stats.median)}
                </TableCell>
                <TableCell class="text-right">
                  {formatNumber(stats.quartile75)}
                </TableCell>
                <TableCell class="text-right">
                  {formatNumber(stats.max)}
                </TableCell>
                <TableCell class="text-right">
                  {formatNumber(stats.standardDeviation)}
                </TableCell>
                <TableCell class="text-right">
                  {stats.basalIob > 0 ? stats.basalIob.toFixed(2) : "—"}
                </TableCell>
                <TableCell class="text-right">
                  {stats.tempIob > 0 ? stats.tempIob.toFixed(2) : "—"}
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Custom styles for the hourly stats table */
  :global(.hourly-stats-table) {
    min-width: 1000px;
  }
</style>
