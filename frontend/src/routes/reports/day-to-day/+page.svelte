<script lang="ts">
  import type { PageData } from "./$types";
  import { LineChart, Line, Point, Axis, Tooltip } from "layerchart";
  import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table";

  let { data }: PageData = $props();

  const reportDetails = $derived(data.dayTodayReport);
  const dailyDataPoints = $derived(reportDetails?.dailyData || []);

  const chartData = $derived(
    dailyDataPoints.map((d) => ({
      x: new Date(d.date),
      y: d.value,
      trend: d.trend,
    }))
  );
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
    </header>

    {#if chartData.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Glucose Trend</h2>
        <div class="h-72 md:h-96">
          <LineChart data={chartData} x="x" y="y" xDomain={null} yDomain={null}
          ></LineChart>
        </div>
      </div>

      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Tabular Data</h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">
            A list of daily glucose readings.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[150px]">Date</TableHead>
              <TableHead>Value (mg/dL)</TableHead>
              <TableHead class="text-right">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each dailyDataPoints as entry (entry.date)}
              <TableRow>
                <TableCell class="font-medium">
                  {new Date(entry.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </TableCell>
                <TableCell>{entry.value}</TableCell>
                <TableCell class="text-right capitalize">
                  {entry.trend}
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {:else}
      <p class="text-center text-gray-500 py-10">
        No data available to display for this report.
      </p>
    {/if}
  {:else}
    <p class="text-center text-gray-500 py-10">Loading report details...</p>
  {/if}
</div>
