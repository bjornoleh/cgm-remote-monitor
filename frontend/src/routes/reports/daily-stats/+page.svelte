<script lang="ts">
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  import { BarChart } from "layerchart";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
  } from "$lib/components/ui/card";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import TIRPieChart from "$lib/components/charts/TIRPieChart.svelte";

  let {
    data,
  }: {
    data: PageData;
  } = $props();

  const reportDetails = $derived(data.dailyStatsReport);
  const currentStats = $derived(reportDetails?.stats);
  const recentDays = $derived(currentStats?.recentDaysStats || []);

  // Date selection
  let selectedDate = $state("");

  // Initialize date input with current URL parameter or default to today
  $effect(() => {
    const dateParam = $page.url.searchParams.get("date");
    if (dateParam) {
      selectedDate = dateParam;
    } else {
      selectedDate = new Date().toISOString().split("T")[0];
    }
  });
  const updateDate = () => {
    const url = new URL($page.url);
    url.searchParams.set("date", selectedDate);
    goto(url.toString());
  };

  const tirForPie = $derived(
    currentStats && currentStats.timeInRanges && currentStats.tirColors
      ? [
          {
            name: "Very Low",
            key: "veryLow",
            value: currentStats.timeInRanges.veryLow,
            color: currentStats.tirColors.veryLow,
          },
          {
            name: "Low",
            key: "low",
            value: currentStats.timeInRanges.low,
            color: currentStats.tirColors.low,
          },
          {
            name: "Target",
            key: "target",
            value: currentStats.timeInRanges.target,
            color: currentStats.tirColors.target,
          },
          {
            name: "High",
            key: "high",
            value: currentStats.timeInRanges.high,
            color: currentStats.tirColors.high,
          },
          {
            name: "Very High",
            key: "veryHigh",
            value: currentStats.timeInRanges.veryHigh,
            color: currentStats.tirColors.veryHigh,
          },
        ].filter((segment) => segment.value > 0)
      : []
  ); // Filter out segments with 0 value

  const tirBarChartData = $derived(
    recentDays
      .map((day) => ({
        date: day.date,
        averageGlucose: day.averageGlucose,
        timeInRangePercent: day.timeInRanges.target, // Use target range as the main TIR metric
        veryLow: day.timeInRanges.veryLow,
        low: day.timeInRanges.low,
        target: day.timeInRanges.target,
        high: day.timeInRanges.high,
        veryHigh: day.timeInRanges.veryHigh,
      }))
      .reverse()
  );
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

    <!-- Date Selection -->
    <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-700 mb-4">Select Date</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div class="space-y-2">
          <Label for="selected-date">Date</Label>
          <Input id="selected-date" type="date" bind:value={selectedDate} />
        </div>
        <div>
          <Button on:click={updateDate} class="w-full md:w-auto">
            View Stats
          </Button>
        </div>
      </div>
    </div>

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
      <!-- Stats content -->

      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8"
      >
        <Card class="lg:col-span-1">
          <CardHeader>
            <CardTitle>Time In Range Distribution</CardTitle>
            <CardDescription>Daily TIR Overview</CardDescription>
          </CardHeader>
          <CardContent class="p-0 pt-2">
            {#if tirForPie.length > 0}
              <TIRPieChart tirData={tirForPie} />
            {:else}
              <p class="text-sm text-gray-500 text-center p-4">
                TIR data not available.
              </p>
            {/if}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Glucose</CardTitle>
            <CardDescription>Overall average</CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-bold">
              {currentStats.averageGlucose}
              <span class="text-lg">mg/dL</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Glucose Variability</CardTitle>
            <CardDescription>Standard Deviation</CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-bold">
              {currentStats.stdDev}
              <span class="text-lg">mg/dL</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>MAGE</CardTitle>
            <CardDescription>
              Mean Amplitude of Glycemic Excursions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-bold">{currentStats.MAGE}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>High/Low Events</CardTitle>
            <CardDescription>Number of events</CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-lg">
              Highs: <span class="font-bold">{currentStats.highEvents}</span>
            </p>
            <p class="text-lg">
              Lows: <span class="font-bold">{currentStats.lowEvents}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estimated A1c</CardTitle>
            <CardDescription>Based on average glucose</CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-bold">{currentStats.estimatedA1c}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CGM Active</CardTitle>
            <CardDescription>Percentage of time CGM was active</CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-bold">{currentStats.cgmActivePercent}%</p>
          </CardContent>
        </Card>
      </div>
      {#if tirBarChartData.length > 0}<div
          class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8"
        >
          <h2 class="text-xl font-semibold text-gray-700 mb-4">
            Recent Daily Target Range (%) - Time in 70-180 mg/dL
          </h2>
          <div class="h-72 md:h-96">
            <BarChart
              seriesLayout="stack"
              data={tirBarChartData}
              x="date"
              series={tirForPie}
              yPadding={[0.1]}
            ></BarChart>
          </div>
        </div>
      {/if}

      {#if recentDays.length > 0}
        <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-4">
            Recent Days Overview
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Average Glucose (mg/dL)</TableHead>
                <TableHead class="text-right">Very Low (%)</TableHead>
                <TableHead class="text-right">Low (%)</TableHead>
                <TableHead class="text-right">Target (%)</TableHead>
                <TableHead class="text-right">High (%)</TableHead>
                <TableHead class="text-right">Very High (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each recentDays as day (day.date)}
                <TableRow>
                  <TableCell class="font-medium">
                    {new Date(day.date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>{day.averageGlucose}</TableCell>
                  <TableCell class="text-right text-red-600">
                    {day.timeInRanges.veryLow}%
                  </TableCell>
                  <TableCell class="text-right text-yellow-600">
                    {day.timeInRanges.low}%
                  </TableCell>
                  <TableCell class="text-right text-green-600">
                    {day.timeInRanges.target}%
                  </TableCell>
                  <TableCell class="text-right text-orange-600">
                    {day.timeInRanges.high}%
                  </TableCell>
                  <TableCell class="text-right text-red-700">
                    {day.timeInRanges.veryHigh}%
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      {/if}
    {/if}
    <!-- End of currentStats check -->
  {:else}
    <p class="text-center text-gray-500 py-10">Loading daily statistics...</p>
  {/if}
</div>
