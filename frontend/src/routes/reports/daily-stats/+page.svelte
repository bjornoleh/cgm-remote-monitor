<script lang="ts">
  import type { PageData } from './$types';

  import { LayerChart, Bar, XAxis, YAxis, Tooltip } from 'layerchart';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
  import TIRPieChart from '$lib/components/charts/TIRPieChart.svelte'; // Import the new component

  let { data }: PageData = $props();

  const reportDetails = $derived(data.dailyStatsReport);
  const currentStats = $derived(reportDetails?.stats);
  const recentDays = $derived(currentStats?.recentDaysStats || []);
  
  const tirForPie = $derived(currentStats && currentStats.timeInRanges && currentStats.tirColors ? [
    { name: 'Very Low', value: currentStats.timeInRanges.veryLow, color: currentStats.tirColors.veryLow },
    { name: 'Low', value: currentStats.timeInRanges.low, color: currentStats.tirColors.low },
    { name: 'Target', value: currentStats.timeInRanges.target, color: currentStats.tirColors.target },
    { name: 'High', value: currentStats.timeInRanges.high, color: currentStats.tirColors.high },
    { name: 'Very High', value: currentStats.timeInRanges.veryHigh, color: currentStats.tirColors.veryHigh }
  ].filter(segment => segment.value > 0) : []); // Filter out segments with 0 value

  const tirBarChartData = $derived( // Renamed to avoid conflict
    recentDays.map(day => ({
      x: new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      y: day.timeInRangePercent
    })).reverse()
  );

</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  {#if reportDetails && currentStats}
    <header class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{reportDetails.reportName}</h1>
      <p class="text-xs md:text-sm text-gray-600">For date: {new Date(currentStats.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} (Generated: {reportDetails.generatedDate})</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
      <Card class="lg:col-span-1">
        <CardHeader>
          <CardTitle>Time In Range Distribution</CardTitle>
          <CardDescription>Daily TIR Overview</CardDescription>
        </CardHeader>
        <CardContent class="p-0 pt-2"> {/* Adjusted padding for chart */}
          {#if tirForPie.length > 0}
            <TIRPieChart tirData={tirForPie} />
          {:else}
            <p class="text-sm text-gray-500 text-center p-4">TIR data not available.</p>
          {/if}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Average Glucose</CardTitle>
          <CardDescription>Overall average</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-3xl font-bold">{currentStats.averageGlucose} <span class="text-lg">mg/dL</span></p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Glucose Variability</CardTitle>
          <CardDescription>Standard Deviation</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-3xl font-bold">{currentStats.stdDev} <span class="text-lg">mg/dL</span></p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>MAGE</CardTitle>
           <CardDescription>Mean Amplitude of Glycemic Excursions</CardDescription>
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
          <p class="text-lg">Highs: <span class="font-bold">{currentStats.highEvents}</span></p>
          <p class="text-lg">Lows: <span class="font-bold">{currentStats.lowEvents}</span></p>
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

    {#if tirBarChartData.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Recent Daily Time In Range (%)</h2>
        <div class="h-72 md:h-96">
          <LayerChart data={tirBarChartData} x="x" y="y" xDomain={null} yDomain={null} yPadding={0.1}>
            <XAxis grid={false} />
            <YAxis grid={true} ticks={5} label="TIR (%)" />
            <Bar class="fill-teal-500" />
            <Tooltip let:data>
                <div class="p-2 bg-white border-gray-200 shadow-lg rounded-md text-sm">
                    <p class="font-semibold">{data[0].x}: {data[0].y}%</p>
                </div>
            </Tooltip>
          </LayerChart>
        </div>
      </div>
    {/if}

    {#if recentDays.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Recent Days Overview</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Average Glucose (mg/dL)</TableHead>
              <TableHead class="text-right">Time In Range (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each recentDays as day (day.date)}
              <TableRow>
                <TableCell class="font-medium">{new Date(day.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                <TableCell>{day.averageGlucose}</TableCell>
                <TableCell class="text-right">{day.timeInRangePercent}%</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {/if}

  {:else}
    <p class="text-center text-gray-500 py-10">Loading daily statistics...</p>
  {/if}
</div>
