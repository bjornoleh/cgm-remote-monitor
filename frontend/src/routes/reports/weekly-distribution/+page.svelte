<script lang="ts">
  import type { PageData } from './$types';

  import { LayerChart, Rect, Line, XAxis, YAxis, Tooltip } from 'layerchart'; // Grid removed as not used
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '$lib/components/ui/table';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card'; // Import Card
  import TIRPieChart from '$lib/components/charts/TIRPieChart.svelte'; // Import the pie chart

  let { data }: PageData = $props();

  const reportDetails = $derived(data.weeklyDistributionReport);
  const distributionDataByDay = $derived(reportDetails?.distributionByDay || []); // Renamed for clarity
  const avgWeeklyTIR = $derived(reportDetails?.averageWeeklyTIR);
  const tirColors = $derived(reportDetails?.tirColors);
  
  const yDomainBoxPlot = $derived([ // Renamed for clarity
    Math.min(0, ...distributionDataByDay.map(d => +d.min)) - 10,
    Math.max(...distributionDataByDay.map(d => +d.max)) + 10
  ]);

  const pieChartData = $derived(avgWeeklyTIR && tirColors ? [
    { name: 'Very Low (<54)', value: avgWeeklyTIR.veryLow, color: tirColors.veryLow },
    { name: 'Low (54-69)', value: avgWeeklyTIR.low, color: tirColors.low },
    { name: 'Target (70-180)', value: avgWeeklyTIR.target, color: tirColors.target },
    { name: 'High (181-250)', value: avgWeeklyTIR.high, color: tirColors.high },
    { name: 'Very High (>250)', value: avgWeeklyTIR.veryHigh, color: tirColors.veryHigh }
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
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Glucose Distribution by Day of Week</h2>
        {#if distributionDataByDay.length > 0}
          <div class="h-96 md:h-[500px]">
            <LayerChart 
              data={distributionDataByDay} 
              x="day" 
              yDomain={yDomainBoxPlot}
              xScaleType="band"
              xPadding={0.3}
            >
              <XAxis dataKey="day" label="Day of Week" grid={false} />
              <YAxis label="Glucose (mg/dL)" grid={true} ticks={6}/>
              <Rect y0={d => +d.q1} y1={d => +d.q3} class="fill-blue-500 opacity-60" widthRatio={0.6} />
              <Line each={d => [{ x: d.day, y: +d.median }, { x: d.day, y: +d.median }]} let:xPoints let:yPoints class="stroke-blue-800" lineWidth={2}>
                {#each xPoints as x, i}
                  <line x1={xPoints[i] - ((this.xBandwidth ? this.xBandwidth() : 50) * 0.3)} y1={yPoints[i]} x2={xPoints[i] + ((this.xBandwidth ? this.xBandwidth() : 50) * 0.3)} y2={yPoints[i]} class="stroke-blue-800" stroke-width="2"/>
                {/each}
              </Line>
              <Line each={d => [{ x: d.day, y: +d.min }, { x: d.day, y: +d.q1 }]} class="stroke-blue-700" lineWidth={1.5} />
              <Line each={d => [{ x: d.day, y: +d.q3 }, { x: d.day, y: +d.max }]} class="stroke-blue-700" lineWidth={1.5} />
              <Line each={d => [{ x: d.day, y: +d.min }, { x: d.day, y: +d.min }]} let:xPoints let:yPoints class="stroke-blue-700" lineWidth={1.5}>
                {#each xPoints as x, i}
                  <line x1={xPoints[i] - ((this.xBandwidth ? this.xBandwidth() : 50) * 0.15)} y1={yPoints[i]} x2={xPoints[i] + ((this.xBandwidth ? this.xBandwidth() : 50) * 0.15)} y2={yPoints[i]} class="stroke-blue-700" stroke-width="1.5"/>
                {/each}
              </Line>
              <Line each={d => [{ x: d.day, y: +d.max }, { x: d.day, y: +d.max }]} let:xPoints let:yPoints class="stroke-blue-700" lineWidth={1.5}>
                {#each xPoints as x, i}
                  <line x1={xPoints[i] - ((this.xBandwidth ? this.xBandwidth() : 50) * 0.15)} y1={yPoints[i]} x2={xPoints[i] + ((this.xBandwidth ? this.xBandwidth() : 50) * 0.15)} y2={yPoints[i]} class="stroke-blue-700" stroke-width="1.5"/>
                {/each}
              </Line>
              <Tooltip let:data hideWhen={!data}>
                {#if data}
                <div class="p-2 bg-white border-gray-200 shadow-lg rounded-md text-sm">
                  <p class="font-semibold">{data.day}</p>
                  <p>Max: {data.max} mg/dL</p>
                  <p>Q3: {data.q3} mg/dL</p>
                  <p>Median: {data.median} mg/dL</p>
                  <p>Q1: {data.q1} mg/dL</p>
                  <p>Min: {data.min} mg/dL</p>
                </div>
                {/if}
              </Tooltip>
            </LayerChart>
          </div>
        {:else}
          <p class="text-center text-gray-500 py-10">Box plot data not available.</p>
        {/if}
      </div>

      <div class="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Average Weekly TIR</CardTitle>
            <CardDescription>Overall Time In Range for the week</CardDescription>
          </CardHeader>
          <CardContent class="p-0 flex justify-center items-center">
            {#if pieChartData.length > 0}
              <TIRPieChart tirData={pieChartData} />
            {:else}
              <p class="text-sm text-gray-500 text-center p-4">Average Weekly TIR data not available.</p>
            {/if}
          </CardContent>
        </Card>
      </div>
    </div>

    {#if distributionDataByDay.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Detailed Weekly Distribution Data</h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">Min, Q1, Median, Q3, and Max glucose values for each day.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead class="text-right">Min</TableHead>
              <TableHead class="text-right">Q1</TableHead>
              <TableHead class="text-right">Median</TableHead>
              <TableHead class="text-right">Q3</TableHead>
              <TableHead class="text-right">Max</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each distributionDataByDay as dayStat (dayStat.day)}
              <TableRow>
                <TableCell class="font-medium">{dayStat.day}</TableCell>
                <TableCell class="text-right">{dayStat.min}</TableCell>
                <TableCell class="text-right">{dayStat.q1}</TableCell>
                <TableCell class="text-right">{dayStat.median}</TableCell>
                <TableCell class="text-right">{dayStat.q3}</TableCell>
                <TableCell class="text-right">{dayStat.max}</TableCell>
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
