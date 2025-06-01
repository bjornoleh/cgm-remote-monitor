<script lang="ts">
  import type { PageData } from "./$types";
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Calendar, Download, RefreshCw } from "lucide-svelte";
  import WeeklyGlucosePercentileChart from "$lib/components/reports/WeeklyGlucosePercentileChart.svelte";
  import { TIR_COLORS_RGB } from "$lib/constants/tir-colors";

  let { data }: { data: PageData } = $props();

  const reportData = $derived(data.success ? data.data : null);
  const weeklyPercentileData = $derived(reportData?.weeklyPercentileData || []);
  const dateRange = $derived(reportData?.dateRange);

  // Format date range for display
  const formatDateRange = (range: any) => {
    if (!range) return "";
    const from = new Date(range.from).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const to = new Date(range.to).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${from} - ${to}`;
  };

  // Calculate summary statistics
  const summaryStats = $derived.by(() => {
    if (weeklyPercentileData.length === 0) {
      return {
        totalWeeks: 0,
        avgMedian: 0,
        avgTimeInRange: 0,
        avgHigh: 0,
        avgLow: 0,
      };
    }
    const avgMedian =
      weeklyPercentileData.reduce((sum, week) => sum + week.median, 0) /
      weeklyPercentileData.length;
    const avgP25 =
      weeklyPercentileData.reduce((sum, week) => sum + week.p25, 0) /
      weeklyPercentileData.length;
    const avgP75 =
      weeklyPercentileData.reduce((sum, week) => sum + week.p75, 0) /
      weeklyPercentileData.length;
    const avgHigh =
      weeklyPercentileData.reduce((sum, week) => sum + week.p90, 0) /
      weeklyPercentileData.length;
    const avgLow =
      weeklyPercentileData.reduce((sum, week) => sum + week.p10, 0) /
      weeklyPercentileData.length;

    // Estimate time in range based on 25th-75th percentiles being in target range
    const avgTimeInRange = ((avgP75 - avgP25) / (avgHigh - avgLow)) * 50; // Rough estimation

    return {
      totalWeeks: weeklyPercentileData.length,
      avgMedian: Math.round(avgMedian),
      avgTimeInRange: Math.round(Math.max(0, Math.min(100, avgTimeInRange))),
      avgHigh: Math.round(avgHigh),
      avgLow: Math.round(avgLow),
    };
  });

  const chartData = $derived(weeklyPercentileData);
</script>

<svelte:head>
  <title>Weekly Overview Report - Nightscout</title>
  <meta
    name="description"
    content="Weekly glucose percentile distribution and overview analysis"
  />
</svelte:head>

<div class="container mx-auto px-4 py-6 space-y-8">
  <!-- Header -->
  <div
    class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
  >
    <div>
      <h1 class="text-3xl font-bold">Weekly Overview Report</h1>
      <p class="text-muted-foreground">
        Glucose percentile distribution and trends over time
      </p>
      {#if dateRange}
        <p class="text-sm text-muted-foreground mt-1">
          <Calendar class="inline w-4 h-4 mr-1" />
          {formatDateRange(dateRange)}
        </p>
      {/if}
    </div>

    <div class="flex gap-2">
      <Button variant="outline" size="sm">
        <Download class="w-4 h-4 mr-2" />
        Export
      </Button>
      <Button variant="outline" size="sm">
        <RefreshCw class="w-4 h-4 mr-2" />
        Refresh
      </Button>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium">Total Weeks</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{summaryStats.totalWeeks}</div>
        <p class="text-xs text-muted-foreground">Data periods</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium">Avg Median</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{summaryStats.avgMedian}</div>
        <p class="text-xs text-muted-foreground">mg/dL</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium">Est. TIR</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold text-green-600">
          {summaryStats.avgTimeInRange}%
        </div>
        <p class="text-xs text-muted-foreground">Estimated</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium">Avg High (90%)</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold" style="color: {TIR_COLORS_RGB.high}">
          {summaryStats.avgHigh}
        </div>
        <p class="text-xs text-muted-foreground">mg/dL</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium">Avg Low (10%)</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold" style="color: {TIR_COLORS_RGB.low}">
          {summaryStats.avgLow}
        </div>
        <p class="text-xs text-muted-foreground">mg/dL</p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Main Chart -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Weekly Glucose Percentile Distribution</Card.Title>
      <Card.Description>
        Stacked area chart showing glucose distribution across percentiles over
        time. Each layer represents a different percentile range from 10th to
        90th percentile.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      {#if !data.success}
        <div
          class="flex items-center justify-center h-[400px] text-muted-foreground"
        >
          <div class="text-center">
            <p class="text-lg font-medium">Error loading data</p>
            <p class="text-sm">{data.error || "Unknown error occurred"}</p>
          </div>
        </div>
      {:else if chartData.length === 0}
        <div
          class="flex items-center justify-center h-[400px] text-muted-foreground"
        >
          <div class="text-center">
            <p class="text-lg font-medium">No data available</p>
            <p class="text-sm">
              No glucose data found for the selected time period
            </p>
          </div>
        </div>
      {:else}
        <WeeklyGlucosePercentileChart data={weeklyPercentileData} />
      {/if}
    </Card.Content>
  </Card.Root>
  <!-- Data Table -->
  {#if data.success && chartData.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Weekly Percentile Data</Card.Title>
        <Card.Description>
          Detailed breakdown of glucose percentiles by week
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head class="text-left">Week Starting</Table.Head>
              <Table.Head class="text-right">10th %ile</Table.Head>
              <Table.Head class="text-right">25th %ile</Table.Head>
              <Table.Head class="text-right">Median</Table.Head>
              <Table.Head class="text-right">75th %ile</Table.Head>
              <Table.Head class="text-right">90th %ile</Table.Head>
              <Table.Head class="text-right">Range</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each chartData as week}
              <Table.Row>
                <Table.Cell>
                  {week.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Table.Cell>
                <Table.Cell
                  class="text-right"
                  style="color: {TIR_COLORS_RGB.low}"
                >
                  {Math.round(week.p10)}
                </Table.Cell>
                <Table.Cell
                  class="text-right"
                  style="color: {TIR_COLORS_RGB.low}"
                >
                  {Math.round(week.p25)}
                </Table.Cell>
                <Table.Cell
                  class="text-right font-medium"
                  style="color: {TIR_COLORS_RGB.target}"
                >
                  {Math.round(week.median)}
                </Table.Cell>
                <Table.Cell
                  class="text-right"
                  style="color: {TIR_COLORS_RGB.high}"
                >
                  {Math.round(week.p75)}
                </Table.Cell>
                <Table.Cell
                  class="text-right"
                  style="color: {TIR_COLORS_RGB.high}"
                >
                  {Math.round(week.p90)}
                </Table.Cell>
                <Table.Cell class="text-right text-muted-foreground">
                  {Math.round(week.p90 - week.p10)}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Insights -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Key Insights</Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
          <div>
            <p class="font-medium">Percentile Distribution</p>
            <p class="text-sm text-muted-foreground">
              The chart shows your glucose distribution across different
              percentiles over time. The middle band (25th-75th percentile)
              represents the range where 50% of your readings fall.
            </p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
          <div>
            <p class="font-medium">Target Range Analysis</p>
            <p class="text-sm text-muted-foreground">
              The green shaded area represents the target glucose range (70-180
              mg/dL). More overlap with the middle percentiles indicates better
              glucose control.
            </p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="w-2 h-2 rounded-full bg-amber-500 mt-2"></div>
          <div>
            <p class="font-medium">Variability Tracking</p>
            <p class="text-sm text-muted-foreground">
              Week-to-week changes in the percentile bands help identify
              patterns and the effectiveness of treatment adjustments.
            </p>
          </div>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
</div>

<style>
  /* Custom styles for better readability */
  table {
    font-variant-numeric: tabular-nums;
  }
</style>
