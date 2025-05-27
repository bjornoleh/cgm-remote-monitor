<script lang="ts">
  import type { PageData } from './$types';

  import { LayerChart, Line, Point, XAxis, YAxis, Tooltip, Legend } from 'layerchart';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '$lib/components/ui/table';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card'; // Import Card
  import TIRPieChart from '$lib/components/charts/TIRPieChart.svelte'; // Import the pie chart

  let { data }: PageData = $props();

  const reportDetails = $derived(data.percentileChartReport);
  const percentileSeriesData = $derived(reportDetails?.percentiles || {}); // Renamed for clarity
  const summaryTableData = $derived(reportDetails?.summaryTable || []); // Renamed for clarity
  const overallTIR = $derived(reportDetails?.overallAverageTIR);
  const tirColors = $derived(reportDetails?.tirColors);

  const percentileChartSeries = $derived( // Renamed for clarity
    Object.entries(percentileSeriesData).map(([name, points]) => ({
      name,
      points: points.map(p => ({ x: p.x, y: p.y }))
    }))
  );

  const lineColors = { // Renamed for clarity
    '10th': 'stroke-red-500 fill-red-500',
    '25th': 'stroke-orange-500 fill-orange-500',
    '50th (Median)': 'stroke-green-500 fill-green-500',
    '75th': 'stroke-blue-500 fill-blue-500',
    '90th': 'stroke-purple-500 fill-purple-500',
  };

  const pieChartData = $derived(overallTIR && tirColors ? [
    { name: 'Very Low (<54)', value: overallTIR.veryLow, color: tirColors.veryLow },
    { name: 'Low (54-69)', value: overallTIR.low, color: tirColors.low },
    { name: 'Target (70-180)', value: overallTIR.target, color: tirColors.target },
    { name: 'High (181-250)', value: overallTIR.high, color: tirColors.high },
    { name: 'Very High (>250)', value: overallTIR.veryHigh, color: tirColors.veryHigh }
  ].filter(segment => segment.value > 0) : []); // Filter out 0-value segments

</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  {#if reportDetails}
    <header class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{reportDetails.reportName}</h1>
      <p class="text-xs md:text-sm text-gray-600">Generated on: {reportDetails.generatedDate}</p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div class="lg:col-span-2 bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Glucose Percentiles Over Time</h2>
        {#if percentileChartSeries.length > 0}
          <div class="h-96 md:h-[500px]">
            <LayerChart data={percentileChartSeries[0]?.points} x="x" y="y" xDomain={null} yDomain={null} seriesKey="name" legend={true}>
              <XAxis dataKey="x" label="Time of Day" grid={true} />
              <YAxis dataKey="y" label="Glucose (mg/dL)" grid={true} ticks={6}/>
              {#each percentileChartSeries as series (series.name)}
                <Line data={series.points} class={lineColors[series.name] || 'stroke-gray-500'} />
              {/each}
              <Tooltip let:data let:seriesName>
                <div class="p-2 bg-white border border-gray-200 shadow-lg rounded-md text-sm">
                  <p class="font-semibold">{seriesName ? seriesName + ' at ' : ''}{data.x}</p>
                  <p>Glucose: {data.y} mg/dL</p>
                </div>
              </Tooltip>
              <Legend items={percentileChartSeries.map(s => ({ name: s.name, color: lineColors[s.name]?.split(' ')[0].replace('stroke-', 'bg-') || 'bg-gray-500' }))} />
            </LayerChart>
          </div>
        {:else}
          <p class="text-center text-gray-500 py-10">Percentile line chart data not available.</p>
        {/if}
      </div>

      <div class="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Overall Average TIR</CardTitle>
            <CardDescription>Estimated Time In Range for the period</CardDescription>
          </CardHeader>
          <CardContent class="p-0 flex justify-center items-center pt-2"> {/* Added pt-2 for spacing */}
            {#if pieChartData.length > 0}
              <TIRPieChart tirData={pieChartData} />
            {:else}
              <p class="text-sm text-gray-500 text-center p-4">Average TIR data not available.</p>
            {/if}
          </CardContent>
        </Card>
      </div>
    </div>

    {#if summaryTableData.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Percentile Summary Statistics</h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">Summary statistics for each percentile.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Percentile</TableHead>
              <TableHead class="text-right">Min (mg/dL)</TableHead>
              <TableHead class="text-right">Avg (mg/dL)</TableHead>
              <TableHead class="text-right">Max (mg/dL)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each summaryTableData as item (item.percentile)}
              <TableRow>
                <TableCell class="font-medium">{item.percentile}</TableCell>
                <TableCell class="text-right">{item.min}</TableCell>
                <TableCell class="text-right">{item.avg}</TableCell>
                <TableCell class="text-right">{item.max}</TableCell>
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
