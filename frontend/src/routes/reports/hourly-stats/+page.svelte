<script lang="ts">
  import type { PageData } from "./$types";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table";
  import * as Card from "$lib/components/ui/card";
  import HourlyIOBChart from "$lib/components/reports/HourlyIOBChart.svelte";
  import HourlyGlucoseBoxChart from "$lib/components/reports/HourlyGlucoseBoxChart.svelte";
  let {
    data,
  }: {
    data: PageData;
  } = $props();
  const reportData = $derived(data.success ? data.data : null);
  const hourlyStats = $derived(reportData?.hourlyStats || []);
  const dateRange = $derived(reportData?.dateRange);

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

<!-- Error State -->
{#if !data.success}
  <Card.Root class="border-destructive bg-destructive/10">
    <Card.Content class="pt-6 text-destructive">
      <Card.Title class="text-destructive">Error loading data</Card.Title>
      <Card.Description class="text-destructive/80">
        {data.error || "Unknown error occurred"}
      </Card.Description>
    </Card.Content>
  </Card.Root>
{:else if hourlyStats.length === 0}
  <Card.Root class="border-muted bg-muted/50">
    <Card.Content class="pt-6 text-muted-foreground">
      <Card.Title class="text-muted-foreground">No data available</Card.Title>
      <Card.Description>
        No glucose readings found for the selected date range.
      </Card.Description>
    </Card.Content>
  </Card.Root>
{:else}<!-- Summary Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <Card.Root>
      <Card.Content class="pt-6">
        <Card.Description>Total Readings</Card.Description>
        <p class="text-2xl font-bold">
          {summaryStats.totalReadings.toLocaleString()}
        </p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="pt-6">
        <Card.Description>Overall Average</Card.Description>
        <p class="text-2xl font-bold">{summaryStats.overallAverage} mg/dL</p>
      </Card.Content>
    </Card.Root>

    {#if summaryStats.highestHour}
      <Card.Root>
        <Card.Content class="pt-6">
          <Card.Description>Highest Hour</Card.Description>
          <p class="text-2xl font-bold">
            {formatHour(summaryStats.highestHour.hour)}
          </p>
          <p class="text-sm text-muted-foreground">
            {formatNumber(summaryStats.highestHour.average)} mg/dL avg
          </p>
        </Card.Content>
      </Card.Root>
    {/if}

    {#if summaryStats.lowestHour}
      <Card.Root>
        <Card.Content class="pt-6">
          <Card.Description>Lowest Hour</Card.Description>
          <p class="text-2xl font-bold">
            {formatHour(summaryStats.lowestHour.hour)}
          </p>
          <p class="text-sm text-muted-foreground">
            {formatNumber(summaryStats.lowestHour.average)} mg/dL avg
          </p>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>
  <!-- Charts Section -->
  <div class="space-y-6">
    <!-- Glucose Box Chart -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Hourly Glucose Distribution</Card.Title>
      </Card.Header>
      <Card.Content>
        <HourlyGlucoseBoxChart {boxPlotData} />
      </Card.Content>
    </Card.Root>

    <!-- IOB Chart -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Hourly Insulin-on-Board</Card.Title>
      </Card.Header>
      <Card.Content>
        <HourlyIOBChart {hourlyStats} />
      </Card.Content>
    </Card.Root>
  </div>
  <!-- Statistics Table -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Hourly Statistics</Card.Title>
      <Card.Description>
        Detailed breakdown of glucose readings and insulin activity by hour
      </Card.Description>
    </Card.Header>
    <Card.Content class="p-0">
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
    </Card.Content>
  </Card.Root>
{/if}

<!-- Date Range Display -->
{#if dateRange}
  <div class="text-center text-sm text-muted-foreground mt-6">
    Showing data from {dateRange.from.toLocaleDateString()} to {dateRange.to.toLocaleDateString()}
  </div>
{/if}
