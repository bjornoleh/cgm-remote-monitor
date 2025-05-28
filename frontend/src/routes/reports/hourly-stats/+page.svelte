<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores'; 

  import { LayerChart, Bar, Rect, Line, XAxis, YAxis, Tooltip } from 'layerchart'; // Added Rect
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '$lib/components/ui/table';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import TIRPieChart from '$lib/components/charts/TIRPieChart.svelte';
  import DateRangePicker from '$lib/components/reports/DateRangePicker.svelte';

  let { data }: PageData = $props();

  const reportDetails = $derived(data.hourlyStatsReport);
  const hourlyStatsData = $derived(reportDetails?.hourlyStats || []); // This now contains min,q1,med,q3,max per hour
  const avgDailyTIRData = $derived(reportDetails?.averageDailyTIR);
  const tirColors = $derived(reportDetails?.tirColors);
  const currentReportDate = $derived(reportDetails?.reportDateUsed);

  const hourlyAvgGlucoseChartData = $derived(
    hourlyStatsData.map(stat => ({
      x: stat.hourLabel, y: stat.averageGlucose, median: stat.median, stdDev: stat.stdDev
    }))
  );

  const pieChartTIRData = $derived(avgDailyTIRData && tirColors ? [
    { name: 'Very Low (<54)', value: avgDailyTIRData.veryLow, color: tirColors.veryLow },
    { name: 'Low (54-69)', value: avgDailyTIRData.low, color: tirColors.low },
    { name: 'Target (70-180)', value: avgDailyTIRData.target, color: tirColors.target },
    { name: 'High (181-250)', value: avgDailyTIRData.high, color: tirColors.high },
    { name: 'Very High (>250)', value: avgDailyTIRData.veryHigh, color: tirColors.veryHigh }
  ].filter(segment => segment.value > 0) : []);
  
  const hourlyBoxPlotYDomain = $derived([ // Calculate domain for box plots
    Math.min(0, ...hourlyStatsData.map(d => d.min)) -10, // Ensure y-axis starts at or below 0, or slightly below min
    Math.max(250, ...hourlyStatsData.map(d => d.max)) + 10 // Ensure a reasonable max if all values are low
  ]);


  function handleDateChange(event: CustomEvent<{ startDate: string; endDate: string }>) {
    const reportDate = event.detail.startDate;
    const currentPath = $page.url.pathname;
    goto(`${currentPath}?reportDate=${reportDate}`, { keepFocus: true, invalidateAll: true });
  }
</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  <header class="mb-6">
    <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{reportDetails?.reportName || 'Hourly Statistics'}</h1>
    {#if currentReportDate}
      <p class="text-xs md:text-sm text-gray-600">
        Showing stats for: {new Date(currentReportDate + 'T00:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
        (Generated: {reportDetails?.generatedDate})
      </p>
    {/if}
  </header>

  <div class="mb-6 bg-white shadow-md rounded-lg p-4">
    <h3 class="text-lg font-medium text-gray-700 mb-2">Select Report Date:</h3>
    <DateRangePicker on:dateChange={handleDateChange} />
    <p class="text-xs text-gray-500 mt-1">Use the 'Start Date' to pick the day for the hourly report. 'End Date' is ignored.</p>
  </div>

  {#if reportDetails}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div class="lg:col-span-2 bg-white shadow-lg rounded-lg p-4 md:p-6">
            <h2 class="text-xl font-semibold text-gray-700 mb-4">Average Glucose by Hour</h2>
            {#if hourlyAvgGlucoseChartData.length > 0}
            <div class="h-72 md:h-96">
              <LayerChart data={hourlyAvgGlucoseChartData} x="x" y="y" xDomain={null} yDomain={null} yPadding={0.1}>
                <XAxis dataKey="x" label="Hour of Day" grid={false} class="text-xs" />
                <YAxis dataKey="y" label="Average Glucose (mg/dL)" grid={true} ticks={5}/>
                <Bar class="fill-sky-600" />
                <Tooltip let:data>
                  <div class="p-2 bg-white border-gray-200 shadow-lg rounded-md text-sm">
                    <p class="font-semibold">Hour: {data[0].x}</p>
                    <p>Avg. Glucose: {data[0].y} mg/dL</p>
                    <p>Median: {data[0].median} mg/dL</p>
                    <p>Std Dev: {data[0].stdDev} mg/dL</p>
                  </div>
                </Tooltip>
              </LayerChart>
            </div>
            {:else}
             <p class="text-center text-gray-500 py-10">Hourly average glucose data not available.</p>
            {/if}
        </div>
        <div class="lg:col-span-1">
            <Card> <CardHeader> <CardTitle>Average Daily TIR</CardTitle>
                <CardDescription>Overall Time In Range for {currentReportDate ? new Date(currentReportDate + 'T00:00:00Z').toLocaleDateString(undefined, {month: 'short', day: 'numeric', timeZone: 'UTC'}) : 'the day'}</CardDescription>
                </CardHeader>
                <CardContent class="p-0 flex justify-center items-center pt-2">
                    {#if pieChartTIRData.length > 0} <TIRPieChart tirData={pieChartTIRData} />
                    {:else} <p class="text-sm text-gray-500 text-center p-4">Average TIR data not available.</p> {/if}
                </CardContent>
            </Card>
        </div>
    </div>

    <!-- New Section for Hourly Distribution Box Plots -->
    {#if hourlyStatsData.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Hourly Glucose Distribution (Box Plots)</h2>
        <div class="h-96 md:h-[500px]">
          <LayerChart data={hourlyStatsData} x="hourLabel" yDomain={hourlyBoxPlotYDomain} xScaleType="band" xPadding={0.3}>
            <XAxis dataKey="hourLabel" label="Hour of Day" grid={false} class="text-xs"/>
            <YAxis label="Glucose (mg/dL)" grid={true} ticks={6} />
            
            <Rect y0={d => d.q1} y1={d => d.q3} class="fill-violet-500 opacity-60" widthRatio={0.5} />
            
            <Line each={d => [{ x: d.hourLabel, y: d.median }, { x: d.hourLabel, y: d.median }]} let:xPoints let:yPoints class="stroke-violet-800" lineWidth={2}>
              {#each xPoints as x, i}
                <line x1={xPoints[i] - ((this.xBandwidth ? this.xBandwidth() : 40) * 0.25)} y1={yPoints[i]} x2={xPoints[i] + ((this.xBandwidth ? this.xBandwidth() : 40) * 0.25)} y2={yPoints[i]} class="stroke-violet-800" stroke-width="2"/>
              {/each}
            </Line>

            <Line each={d => [{ x: d.hourLabel, y: d.min }, { x: d.hourLabel, y: d.q1 }]} class="stroke-violet-700" lineWidth={1.5} />
            <Line each={d => [{ x: d.hourLabel, y: d.q3 }, { x: d.hourLabel, y: d.max }]} class="stroke-violet-700" lineWidth={1.5} />

            <Line each={d => [{ x: d.hourLabel, y: d.min }, { x: d.hourLabel, y: d.min }]} let:xPoints let:yPoints class="stroke-violet-700" lineWidth={1.5}>
              {#each xPoints as x, i} <line x1={xPoints[i] - 5} y1={yPoints[i]} x2={xPoints[i] + 5} y2={yPoints[i]} class="stroke-violet-700" stroke-width="1.5"/> {/each}
            </Line>
            <Line each={d => [{ x: d.hourLabel, y: d.max }, { x: d.hourLabel, y: d.max }]} let:xPoints let:yPoints class="stroke-violet-700" lineWidth={1.5}>
              {#each xPoints as x, i} <line x1={xPoints[i] - 5} y1={yPoints[i]} x2={xPoints[i] + 5} y2={yPoints[i]} class="stroke-violet-700" stroke-width="1.5"/> {/each}
            </Line>

            <Tooltip let:data hideWhen={!data}>
              {#if data}
              <div class="p-2 bg-white border-gray-200 shadow-lg rounded-md text-sm">
                <p class="font-semibold">Hour: {data.hourLabel}</p>
                <p>Max: {data.max} mg/dL</p> <p>Q3: {data.q3} mg/dL</p>
                <p>Median: {data.median} mg/dL</p> <p>Q1: {data.q1} mg/dL</p>
                <p>Min: {data.min} mg/dL</p>
              </div>
              {/if}
            </Tooltip>
          </LayerChart>
        </div>
      </div>
    {/if}

    {#if hourlyStatsData.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Detailed Hourly Statistics for {currentReportDate ? new Date(currentReportDate + 'T00:00:00Z').toLocaleDateString(undefined, {month: 'long', day: 'numeric', timeZone: 'UTC'}) : ''}</h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">Glucose metrics for each hour of the selected day.</TableCaption>
          <TableHeader> <TableRow>
              <TableHead>Hour</TableHead> <TableHead>Avg.</TableHead> <TableHead>Min</TableHead>
              <TableHead>Q1</TableHead> <TableHead>Median</TableHead> <TableHead>Q3</TableHead>
              <TableHead>Max</TableHead><TableHead>StdDev</TableHead>
              <TableHead>TIR Target(%)</TableHead>
          </TableRow> </TableHeader>
          <TableBody>
            {#each hourlyStatsData as hourStat (hourStat.hourLabel)}
              <TableRow>
                <TableCell class="font-medium">{hourStat.hourLabel}</TableCell>
                <TableCell>{hourStat.averageGlucose}</TableCell> <TableCell>{hourStat.min}</TableCell>
                <TableCell>{hourStat.q1}</TableCell> <TableCell>{hourStat.median}</TableCell>
                <TableCell>{hourStat.q3}</TableCell> <TableCell>{hourStat.max}</TableCell>
                <TableCell>{hourStat.stdDev}</TableCell>
                <TableCell>{hourStat.timeInRanges.target}%</TableCell>
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
