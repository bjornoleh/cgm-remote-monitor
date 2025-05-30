<script lang="ts">
  import type { PageData } from "./$types";

  import { LayerChart, Bar, XAxis, YAxis, Tooltip } from "layerchart";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableCaption,
  } from "$lib/components/ui/table";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
  } from "$lib/components/ui/card";
  import TIRPieChart from "$lib/components/charts/TIRPieChart.svelte";
  import tirColors from "$lib/constants/tir-colors.js";

  let { data } = $props();

  const hourlyStatsData = $derived(data?.hourlyStats || []);
  const avgDailyTIRData = $derived(data?.averageDailyTIR);

  const hourlyAvgGlucoseChartData = $derived(
    hourlyStatsData.map((stat) => ({
      x: stat.hourLabel,
      y: stat.averageGlucose,
      median: stat.medianGlucose,
      stdDev: stat.stdDev,
    }))
  );

  const pieChartTIRData = $derived(
    avgDailyTIRData && tirColors
      ? [
          {
            name: "Very Low (<54)",
            value: avgDailyTIRData.severeLow,
            color: tirColors.severeLow,
          },
          {
            name: "Low (54-69)",
            value: avgDailyTIRData.low,
            color: tirColors.low,
          },
          {
            name: "Target (70-180)",
            value: avgDailyTIRData.target,
            color: tirColors.target,
          },
          {
            name: "High (181-250)",
            value: avgDailyTIRData.high,
            color: tirColors.high,
          },
          {
            name: "Very High (>250)",
            value: avgDailyTIRData.severeHigh,
            color: tirColors.severeHigh,
          },
        ].filter((segment) => segment.value > 0)
      : []
  );
</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  {#if data}
    <header class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
        {data.reportName}
      </h1>
      <p class="text-xs md:text-sm text-gray-600">
        Generated on: {data.generatedDate}
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div class="lg:col-span-2 bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          Average Glucose by Hour
        </h2>
        {#if hourlyAvgGlucoseChartData.length > 0}
          <div class="h-72 md:h-96">
            <LayerChart
              data={hourlyAvgGlucoseChartData}
              x="x"
              y="y"
              xDomain={null}
              yDomain={null}
              yPadding={0.1}
            >
              <XAxis dataKey="x" label="Hour of Day" grid={false} />
              <YAxis
                dataKey="y"
                label="Average Glucose (mg/dL)"
                grid={true}
                ticks={5}
              />
              <Bar />
              <Tooltip let:data>
                <div
                  class="p-2 bg-white border-gray-200 shadow-lg rounded-md text-sm"
                >
                  <p class="font-semibold">Hour: {data[0].x}</p>
                  <p>Avg. Glucose: {data[0].y} mg/dL</p>
                  <p>Median: {data[0].median} mg/dL</p>
                  <p>Std Dev: {data[0].stdDev} mg/dL</p>
                </div>
              </Tooltip>
            </LayerChart>
          </div>
        {:else}
          <p class="text-center text-gray-500 py-10">
            Hourly average glucose data not available.
          </p>
        {/if}
      </div>

      <div class="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Average Daily TIR</CardTitle>
            <CardDescription>Overall Time In Range for the day</CardDescription>
          </CardHeader>
          <CardContent class="p-0 flex justify-center items-center">
            {#if pieChartTIRData.length > 0}
              <TIRPieChart tirData={pieChartTIRData} />
            {:else}
              <p class="text-sm text-gray-500 text-center p-4">
                Average TIR data not available.
              </p>
            {/if}
          </CardContent>
        </Card>
      </div>
    </div>

    {#if hourlyStatsData.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          Detailed Hourly Statistics
        </h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">
            Glucose metrics for each hour of the day.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Hour</TableHead>
              <TableHead>Avg. Glucose</TableHead>
              <TableHead>Median Glucose</TableHead>
              <TableHead>Std. Dev.</TableHead>
              <TableHead>TIR: Target (%)</TableHead>
              <TableHead>TIR: Low (%)</TableHead>
              <TableHead>TIR: High (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each hourlyStatsData as hourStat (hourStat.hourLabel)}
              <TableRow>
                <TableCell class="font-medium">{hourStat.hourLabel}</TableCell>
                <TableCell>{hourStat.averageGlucose}</TableCell>
                <TableCell>{hourStat.medianGlucose}</TableCell>
                <TableCell>{hourStat.stdDev}</TableCell>
                <TableCell>{hourStat.timeInRanges.target}%</TableCell>
                <TableCell>
                  {hourStat.timeInRanges.low + hourStat.timeInRanges.severeLow}%
                </TableCell>
                <TableCell>
                  {hourStat.timeInRanges.high +
                    hourStat.timeInRanges.severeHigh}%
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {/if}
  {:else}
    <p class="text-center text-gray-500 py-10">Loading report details...</p>
  {/if}
</div>
