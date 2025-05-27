<script lang="ts">
  import type { PageData } from './$types';

  import { LayerChart, Line, Point, XAxis, YAxis, Tooltip } from 'layerchart'; // Bar removed as not used in this version
  import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
  import TIRPieChart from '$lib/components/charts/TIRPieChart.svelte'; // Import the TIR pie chart
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';


  let { data }: PageData = $props();

  const reportDetails = $derived(data.weekToWeekReport);
  const weeklyDataPoints = $derived(reportDetails?.weeklyData || []);
  const mostRecentWeekTIRData = $derived(reportDetails?.mostRecentWeekTIR);
  const tirColors = $derived(reportDetails?.tirColors || {});


  const mainChartData = $derived(
    weeklyDataPoints.map(d => ({
      x: new Date(d.startDate),
      y: d.averageValue,
      weekLabel: d.weekLabel,
      trend: d.trend
    }))
  );

  const pieChartTIRData = $derived(mostRecentWeekTIRData && tirColors ? [
    { name: 'Very Low', value: mostRecentWeekTIRData.veryLow, color: tirColors.veryLow },
    { name: 'Low', value: mostRecentWeekTIRData.low, color: tirColors.low },
    { name: 'Target', value: mostRecentWeekTIRData.target, color: tirColors.target },
    { name: 'High', value: mostRecentWeekTIRData.high, color: tirColors.high },
    { name: 'Very High', value: mostRecentWeekTIRData.veryHigh, color: tirColors.veryHigh }
  ].filter(segment => segment.value > 0) : []); // Filter out segments with 0 value for cleaner pie chart

</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  {#if reportDetails}
    <header class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{reportDetails.reportName}</h1>
      <p class="text-xs md:text-sm text-gray-600">Generated on: {reportDetails.generatedDate}</p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div class="lg:col-span-2 bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Weekly Average Glucose Trend</h2>
        {#if mainChartData.length > 0}
          <div class="h-72 md:h-96">
            <LayerChart data={mainChartData} x="x" y="y" xDomain={null} yDomain={null} --tooltip-snap-to-data={true}>
              <XAxis grid={true} ticks={mainChartData.length} format={(d) => {
                const date = new Date(d);
                const year = date.getFullYear();
                const startOfYear = new Date(year, 0, 1);
                const weekNum = Math.ceil((((date.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
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
          <p class="text-center text-gray-500 py-10">No trend data available.</p>
        {/if}
      </div>

      <div class="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Most Recent Week TIR</CardTitle>
            {#if weeklyDataPoints.length > 0}
              <CardDescription>Time In Range for {weeklyDataPoints[weeklyDataPoints.length - 1].weekLabel}</CardDescription>
            {/if}
          </CardHeader>
          <CardContent class="p-0 flex justify-center items-center pt-2"> {/* Added pt-2 for a bit of space */}
            {#if pieChartTIRData.length > 0 && mostRecentWeekTIRData}
              <TIRPieChart tirData={pieChartTIRData} />
            {:else}
              <p class="text-sm text-gray-500 text-center p-4">TIR data for pie chart not available.</p>
            {/if}
          </CardContent>
        </Card>
      </div>
    </div>

    {#if weeklyDataPoints.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Weekly Data Summary</h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">Summary of weekly glucose readings.</TableCaption>
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
              <TableRow>
                <TableCell class="font-medium">{entry.weekLabel}</TableCell>
                <TableCell>{new Date(entry.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                <TableCell>{entry.averageValue}</TableCell>
                <TableCell class="capitalize">{entry.trend}</TableCell>
                <TableCell class="text-right">{entry.notes}</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {:else}
      <p class="text-center text-gray-500 py-10">No weekly data available for table display.</p>
    {/if}

  {:else}
    <p class="text-center text-gray-500 py-10">Loading report details...</p>
  {/if}
</div>
