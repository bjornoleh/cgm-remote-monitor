<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores'; 

  import { LayerChart, Line, Point, XAxis, YAxis, Tooltip } from 'layerchart';
  import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
  import DateRangePicker from '$lib/components/reports/DateRangePicker.svelte'; 

  let { data }: PageData = $props();

  const reportDetails = $derived(data.dayTodayReport);
  const dailyDataPoints = $derived(reportDetails?.dailyData || []);
  
  const currentDataStartDate = $derived(reportDetails?.dataStartDate);
  const currentDataEndDate = $derived(reportDetails?.dataEndDate);


  const chartData = $derived(
    dailyDataPoints.map(d => ({
      x: new Date(d.date + 'T00:00:00Z'), // Explicitly UTC for consistency with server
      y: d.value,
      trend: d.trend
    }))
  );

  function handleDateChange(event: CustomEvent<{ startDate: string; endDate: string }>) {
    const { startDate, endDate } = event.detail;
    const currentPath = $page.url.pathname;
    goto(`${currentPath}?startDate=${startDate}&endDate=${endDate}`, { keepFocus: true, invalidateAll: true });
  }
</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  <header class="mb-6">
    <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{reportDetails?.reportName || 'Day to day Report'}</h1>
    {#if reportDetails?.generatedDate}
      <p class="text-xs md:text-sm text-gray-600">
        Showing data from {currentDataStartDate ? new Date(currentDataStartDate+'T00:00:00Z').toLocaleDateString(undefined, {timeZone: 'UTC'}) : 'N/A'} 
        to {currentDataEndDate ? new Date(currentDataEndDate+'T00:00:00Z').toLocaleDateString(undefined, {timeZone: 'UTC'}) : 'N/A'} 
        (Generated: {reportDetails.generatedDate})
      </p>
    {/if}
  </header>

  <div class="mb-6 bg-white shadow-sm rounded-md p-4"> {/* Added some styling to the picker container */}
    <DateRangePicker on:dateChange={handleDateChange} />
  </div>

  {#if reportDetails}
    {#if chartData.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Glucose Trend</h2>
        <div class="h-72 md:h-96">
          <LayerChart data={chartData} x="x" y="y" xDomain={null} yDomain={null} --tooltip-snap-to-data={true}>
            <XAxis grid={true} ticks={Math.min(7, chartData.length)} format={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })} />
            <YAxis grid={true} ticks={5} label="Glucose (mg/dL)" />
            <Line class="stroke-blue-600" />
            <Point class="fill-blue-600" r={3} />
            <Tooltip
              header={(d) => new Date(d.x).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
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

      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Tabular Data</h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">A list of daily glucose readings for the selected period.</TableCaption>
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
                <TableCell class="font-medium">{new Date(entry.date+'T00:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</TableCell>
                <TableCell>{entry.value}</TableCell>
                <TableCell class="text-right capitalize">{entry.trend}</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {:else}
      <p class="text-center text-gray-500 py-10">No data available for the selected date range.</p>
    {/if}
  {:else}
    <p class="text-center text-gray-500 py-10">Loading report details...</p>
  {/if}
</div>
