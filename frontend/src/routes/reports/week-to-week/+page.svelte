<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores'; 

  import { LayerChart, Line, Point, XAxis, YAxis, Tooltip } from 'layerchart';
  import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import TIRPieChart from '$lib/components/charts/TIRPieChart.svelte';
  import DateRangePicker from '$lib/components/reports/DateRangePicker.svelte'; // Using it to pick a target week

  let { data }: PageData = $props();

  const reportDetails = $derived(data.weekToWeekReport);
  const weeklyDataPoints = $derived(reportDetails?.weeklyData || []);
  const targetWeekTIRData = $derived(reportDetails?.targetWeekTIR);
  const tirColors = $derived(reportDetails?.tirColors);
  const selectedWeekDisplay = $derived(reportDetails?.selectedWeekStartDate); // This is the start date of the target week

  const mainChartData = $derived(
    weeklyDataPoints.map(d => ({
      x: new Date(d.startDate + 'T00:00:00Z'), // Ensure UTC context for dates
      y: d.averageGlucose,
      weekLabel: d.weekLabel,
      trend: d.trend
    }))
  );

  const pieChartTIRData = $derived(targetWeekTIRData && tirColors ? [
    { name: 'Very Low', value: targetWeekTIRData.veryLow, color: tirColors.veryLow },
    { name: 'Low', value: targetWeekTIRData.low, color: tirColors.low },
    { name: 'Target', value: targetWeekTIRData.target, color: tirColors.target },
    { name: 'High', value: targetWeekTIRData.high, color: tirColors.high },
    { name: 'Very High', value: targetWeekTIRData.veryHigh, color: tirColors.veryHigh }
  ].filter(segment => segment.value > 0) : []);

  function handleDateChange(event: CustomEvent<{ startDate: string; endDate: string }>) {
    // For week-to-week, we only care about the startDate to determine the target week
    const targetDate = event.detail.startDate;
    const currentPath = $page.url.pathname;
    goto(`${currentPath}?targetDate=${targetDate}`, { keepFocus: true, invalidateAll: true });
  }

  // Using the more robust UTC-consistent version from my previous turn (Turn 51)
  function getWeekRangeLabel(startDateString: string | undefined): string {
    if (!startDateString) return 'N/A';
    const start = new Date(startDateString + 'T00:00:00Z'); // Treat as UTC
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6); // Use setUTCDate for UTC dates
    return `${start.toLocaleDateString(undefined, {month: 'short', day: 'numeric', timeZone: 'UTC'})} - ${end.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'})}`;
  }
</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  <header class="mb-6">
    <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{reportDetails?.reportName || 'Week to Week Report'}</h1>
    {#if reportDetails?.generatedDate}
      <p class="text-xs md:text-sm text-gray-600">
        Displaying data around week: {getWeekRangeLabel(selectedWeekDisplay)} (Report Generated: {reportDetails.generatedDate})
      </p>
    {/if}
  </header>

  <div class="mb-6"> {/* Changed styling as per prompt */}
    <DateRangePicker on:dateChange={handleDateChange} />
    <p class="text-xs text-gray-500 mt-1">Select any day within your target week using the 'Start Date' picker. The 'End Date' will be ignored for this report.</p>
  </div>

  {#if reportDetails}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div class="lg:col-span-2 bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Weekly Average Glucose Trend</h2>
        {#if mainChartData.length > 0}
          <div class="h-72 md:h-96">
            <LayerChart data={mainChartData} x="x" y="y" xDomain={null} yDomain={null} --tooltip-snap-to-data={true}>
              <XAxis grid={true} ticks={mainChartData.length} format={(d) => {
                const date = new Date(d); // Date from chart data (already UTC)
                const year = date.getUTCFullYear(); // UTC year
                const startOfYear = new Date(Date.UTC(year, 0, 1)); // UTC start of year
                const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)); // UTC day of year
                const weekNum = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7); // UTC day for week calc
                return `${year}-W${weekNum.toString().padStart(2, '0')}`;
              }} />
              <YAxis grid={true} ticks={5} label="Avg. Glucose (mg/dL)" />
              <Line class="stroke-green-600" />
              <Point class="fill-green-600" r={3} />
              <Tooltip header={(d) => d.weekLabel} let:data>
                <div class="p-2 bg-white border border-gray-200 shadow-lg rounded-md text-sm">
                  <p class="font-semibold">Avg. Value: {data[0].y} mg/dL</p>
                  <p class="capitalize">Trend: {data[0].trend}</p>
                </div>
              </Tooltip>
            </LayerChart>
          </div>
        {:else}
          <p class="text-center text-gray-500 py-10">No trend data available for selected week range.</p>
        {/if}
      </div>

      <div class="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>TIR for {selectedWeekDisplay ? weeklyDataPoints.find(w=>w.startDate === selectedWeekDisplay)?.weekLabel : 'Target Week'}</CardTitle>
            <CardDescription>Time In Range distribution</CardDescription>
          </CardHeader>
          <CardContent class="p-0 flex justify-center items-center pt-2">
            {#if pieChartTIRData.length > 0}
              <TIRPieChart tirData={pieChartTIRData} />
            {:else}
              <p class="text-sm text-gray-500 text-center p-4">TIR data for the selected week not available.</p>
            {/if}
          </CardContent>
        </Card>
      </div>
    </div>

    {#if weeklyDataPoints.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Weekly Data Summary</h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">Summary of glucose readings for displayed weeks.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[120px] md:w-[150px]">Week</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Avg. Value (mg/dL)</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead class="text-right">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each weeklyDataPoints as entry (entry.weekLabel)}
              <TableRow class={entry.startDate === selectedWeekDisplay ? 'bg-blue-50' : ''}> {/* Highlight target week */}
                <TableCell class="font-medium">{entry.weekLabel}</TableCell>
                <TableCell>{new Date(entry.startDate+'T00:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</TableCell>
                <TableCell>{entry.averageGlucose}</TableCell>
                <TableCell class="capitalize">{entry.trend}</TableCell>
                <TableCell class="text-right">{entry.notes}</TableCell>
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
