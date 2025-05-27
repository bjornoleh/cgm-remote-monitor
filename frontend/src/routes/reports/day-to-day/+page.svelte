<script lang="ts">
  import type { PageData } from './$types';

  // LayerChart imports (should be preserved)
  import { LayerChart, Line, Point, XAxis, YAxis, Tooltip } from 'layerchart';

  // ShadCN Table component imports (adjust path if necessary)
  import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table'; // Assuming this is the conventional ShadCN Svelte import path

  let { data }: PageData = $props();

  const reportDetails = $derived(data.dayTodayReport);
  const dailyDataPoints = $derived(reportDetails?.dailyData || []);

  const chartData = $derived(
    dailyDataPoints.map(d => ({
      x: new Date(d.date), // LayerChart often expects Date objects for time axes
      y: d.value,
      trend: d.trend
    }))
  );
</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  {#if reportDetails}
    <header class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{reportDetails.reportName}</h1>
      <p class="text-xs md:text-sm text-gray-600">Generated on: {reportDetails.generatedDate}</p>
    </header>

    {#if chartData.length > 0}
      <!-- LayerChart Integration (should be preserved as is from previous version) -->
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Glucose Trend</h2>
        <div class="h-72 md:h-96">
          <LayerChart data={chartData} x="x" y="y" xDomain={null} yDomain={null} --tooltip-snap-to-data={true}>
            <XAxis grid={true} ticks={5} format={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
            <YAxis grid={true} ticks={5} label="Glucose (mg/dL)" />
            <Line class="stroke-blue-600" />
            <Point class="fill-blue-600" r={3} />
            <Tooltip
              header={(d) => new Date(d.x).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              let:data
            >
              <div class="p-2 bg-white border border-gray-200 shadow-lg rounded-md text-sm">
                <p class="font-semibold">Value: {data[0].y} mg/dL</p>
                <p class="capitalize">Trend: {data[0].trend}</p>
              </div>
            </Tooltip>
          </LayerChart>
        </div>
      </div>

      <!-- ShadCN Table for displaying daily data -->
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Tabular Data</h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">A list of daily glucose readings.</TableCaption>
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
                <TableCell class="font-medium">{new Date(entry.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</TableCell>
                <TableCell>{entry.value}</TableCell>
                <TableCell class="text-right capitalize">{entry.trend}</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {:else}
      <p class="text-center text-gray-500 py-10">No data available to display for this report.</p>
    {/if}
  {:else}
    <p class="text-center text-gray-500 py-10">Loading report details...</p>
  {/if}
</div>
