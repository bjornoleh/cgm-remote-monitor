<script lang="ts">
  import type { PageData } from "./$types";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Calendar, Download, RefreshCw } from "lucide-svelte";
  import WeeklyGlucosePercentileChart from "$lib/components/reports/WeeklyGlucosePercentileChart.svelte";

  let { data }: { data: PageData } = $props();
  const reportData = $derived(data.success ? data.data : null);
  const hourlyStats = $derived(reportData?.hourlyStats || []);
  const dateRange = $derived(reportData?.dateRange);
  const tirMetrics = $derived(reportData?.tirMetrics);
  const glucoseMetrics = $derived(reportData?.glucoseMetrics);

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
  // Calculate summary statistics from hourly data
  const summaryStats = $derived.by(() => {
    if (hourlyStats.length === 0) {
      return {
        totalHours: 0,
        avgMedian: 0,
        avgTimeInRange: 0,
        avgHigh: 0,
        avgLow: 0,
        totalReadings: 0,
      };
    }

    const validHours = hourlyStats.filter((h) => h.readingsCount > 0);
    if (validHours.length === 0) {
      return {
        totalHours: 0,
        avgMedian: 0,
        avgTimeInRange: 0,
        avgHigh: 0,
        avgLow: 0,
        totalReadings: 0,
      };
    }

    const avgMedian =
      validHours.reduce((sum, hour) => sum + hour.median, 0) /
      validHours.length;
    const avgLow =
      validHours.reduce((sum, hour) => sum + hour.min, 0) / validHours.length;
    const avgHigh =
      validHours.reduce((sum, hour) => sum + hour.max, 0) / validHours.length;
    const totalReadings = hourlyStats.reduce(
      (sum, hour) => sum + hour.readingsCount,
      0
    );

    // Use server-calculated TIR instead of problematic estimation
    const avgTimeInRange = tirMetrics?.percentages?.target
      ? Math.round(tirMetrics.percentages.target)
      : 0; // Fallback to 0 if TIR data not available

    return {
      totalHours: validHours.length,
      avgMedian: Math.round(avgMedian),
      avgTimeInRange,
      avgHigh: Math.round(avgHigh),
      avgLow: Math.round(avgLow),
      totalReadings,
    };
  });
</script>

<svelte:head>
  <title>Weekly Overview</title>
</svelte:head>

<div class="container mx-auto px-4 py-6 space-y-8">
  <!-- Header -->
  <div
    class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
  >
    <div>
      <h1 class="text-3xl font-bold">Weekly Overview</h1>
      <p class="text-muted-foreground">
        Insights taken from average data across the week.
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
        <Card.Title class="text-sm font-medium">Hours with Data</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{summaryStats.totalHours}</div>
        <p class="text-xs text-muted-foreground">of 24 hours</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium">Total Readings</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{summaryStats.totalReadings}</div>
        <p class="text-xs text-muted-foreground">glucose values</p>
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
        <Card.Title class="text-sm font-medium">Time in Range</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold text-green-600">
          {summaryStats.avgTimeInRange}%
        </div>
        <p class="text-xs text-muted-foreground">70-180 mg/dL</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium">Tight TIR</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold text-blue-600">
          {tirMetrics?.percentages?.tightTarget
            ? Math.round(tirMetrics.percentages.tightTarget)
            : 0}%
        </div>
        <p class="text-xs text-muted-foreground">70-140 mg/dL</p>
      </Card.Content>
    </Card.Root>
  </div>
  <!-- Main Chart -->
  <Card.Root>
    <Card.Header>
      <Card.Title>24-Hour Glucose Percentile Distribution</Card.Title>
      <Card.Description>
        Percentile chart showing glucose distribution across hours of the day.
        This shows how glucose levels vary throughout a typical 24-hour period
        across different percentiles.
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
      {:else}
        <WeeklyGlucosePercentileChart {hourlyStats} />
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="size-2 rounded-full bg-blue-500 mt-2"></div>
            <div>
              <p class="font-medium">24-Hour Percentile Distribution</p>
              <p class="text-sm text-muted-foreground">
                This chart shows how your glucose varies throughout each hour of
                the day. The percentile bands (10th, 25th, 50th, 75th, 90th)
                reveal patterns in glucose control at different times.
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="size-2 rounded-full bg-green-500 mt-2"></div>
            <div>
              <p class="font-medium">Time-of-Day Patterns</p>
              <p class="text-sm text-muted-foreground">
                Look for consistent patterns - dawn phenomenon (early morning
                highs), post-meal spikes, or overnight stability patterns.
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="size-2 rounded-full bg-orange-500 mt-2"></div>
            <div>
              <p class="font-medium">Glucose Variability</p>
              <p class="text-sm text-muted-foreground">
                Wide bands between percentiles indicate higher glucose
                variability at those times. Narrower bands suggest more
                consistent glucose levels.
              </p>
            </div>
          </div>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
