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
  import TIRPieChart from "$lib/components/charts/TIRPieChart.svelte"; // Import the pie chart component

  let { data }: PageData = $props();

  const reportDetails = $derived(data.distributionReport);
  const distributionPoints = $derived(reportDetails?.distributionData || []);
  const summary = $derived(reportDetails?.summaryMetrics); // Original summary for cards
  const tirPieDataFromServer = $derived(reportDetails?.tirForPieChart); // New data for pie
  const tirPieColors = $derived(reportDetails?.tirColors);

  const histogramChartData = $derived(
    // Renamed for clarity
    distributionPoints.map((d) => ({
      x: d.range,
      y: d.percent,
      count: d.count,
    }))
  );

  const pieChartTIRData = $derived(
    tirPieDataFromServer && tirPieColors
      ? [
          {
            name: "Very Low (<54)",
            value: tirPieDataFromServer.veryLow,
            color: tirPieColors.veryLow,
          },
          {
            name: "Low (54-69)",
            value: tirPieDataFromServer.low,
            color: tirPieColors.low,
          },
          {
            name: "Target (70-180)",
            value: tirPieDataFromServer.target,
            color: tirPieColors.target,
          },
          {
            name: "High (181-250)",
            value: tirPieDataFromServer.high,
            color: tirPieColors.high,
          },
          {
            name: "Very High (>250)",
            value: tirPieDataFromServer.veryHigh,
            color: tirPieColors.veryHigh,
          },
        ].filter((segment) => segment.value > 0)
      : []
  ); // Filter out segments with 0 value for cleaner pie chart
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

    <!-- Summary Cards and TIR Pie Chart in a grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {#if summary}
          <Card>
            <CardHeader>
              <CardTitle>Target Range</CardTitle><CardDescription>
                70-180 mg/dL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p class="text-3xl font-bold">
                {summary.percentTarget.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Below Target</CardTitle><CardDescription>
                &lt;70 mg/dL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p class="text-3xl font-bold">
                {(summary.percentVeryLow + summary.percentLow).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Above Target</CardTitle><CardDescription>
                &gt;180 mg/dL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p class="text-3xl font-bold">
                {(summary.percentHigh + summary.percentVeryHigh).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Total Readings</CardTitle></CardHeader>
            <CardContent>
              <p class="text-3xl font-bold">{summary.totalReadings}</p>
            </CardContent>
          </Card>
        {/if}
      </div>
      <div class="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Time In Range Overview</CardTitle>
            <CardDescription>Distribution of TIR</CardDescription>
          </CardHeader>
          <CardContent class="p-0 flex justify-center items-center pt-2">
            {#if pieChartTIRData.length > 0}
              <TIRPieChart tirData={pieChartTIRData} />
            {:else}
              <p class="text-sm text-gray-500 text-center p-4">
                TIR data not available.
              </p>
            {/if}
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Histogram -->
    {#if histogramChartData.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          Distribution of Glucose Readings (%)
        </h2>
        <div class="h-72 md:h-96">
          <LayerChart
            data={histogramChartData}
            x="x"
            y="y"
            xDomain={null}
            yDomain={null}
            yPadding={0.1}
          >
            <XAxis dataKey="x" label="Glucose Range (mg/dL)" grid={false} />
            <YAxis
              dataKey="y"
              label="Percentage of Readings (%)"
              grid={true}
              ticks={5}
            />
            <Bar class="fill-purple-600" />
            <Tooltip let:data>
              <div
                class="p-2 bg-white border-gray-200 shadow-lg rounded-md text-sm"
              >
                <p class="font-semibold">Range: {data[0].x}</p>
                <p>Percent: {data[0].y}%</p>
                <p>Count: {data[0].count}</p>
              </div>
            </Tooltip>
          </LayerChart>
        </div>
      </div>
    {/if}

    <!-- Detailed Table -->
    {#if distributionPoints.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          Detailed Distribution Data
        </h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">
            Count and percentage of readings per glucose range.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Glucose Range (mg/dL)</TableHead>
              <TableHead class="text-right">Count</TableHead>
              <TableHead class="text-right">Percent (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each distributionPoints as bin (bin.range)}
              <TableRow>
                <TableCell class="font-medium">{bin.range}</TableCell>
                <TableCell class="text-right">{bin.count}</TableCell>
                <TableCell class="text-right">
                  {bin.percent.toFixed(1)}%
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
