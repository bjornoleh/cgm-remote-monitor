<script lang="ts">
  import type { PageData } from "./$types";

  import { Axis, ScatterChart, Svg } from "layerchart";
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
  import TIRPieChart from "$lib/components/charts/TIRPieChart.svelte";

  let { data } = $props();
  const distributionPoints = $derived(data?.distributionData || []);
  const tirPieDataFromServer = $derived(data?.tirForPieChart); // New data for pie
  const tirPieColors = $derived(data?.tirColors);

  // Transform distribution data into scatterplot data
  const scatterplotData = $derived.by(() => {
    if (!distributionPoints || distributionPoints.length === 0) return [];

    return distributionPoints.map((point) => {
      // Calculate midpoint of range for x-axis
      let x: number;
      if (point.range === "<40") x = 35;
      else if (point.range === ">300") x = 350;
      else {
        const rangeParts = point.range.split("-");
        if (rangeParts.length === 2) {
          x = (parseInt(rangeParts[0]) + parseInt(rangeParts[1])) / 2;
        } else {
          x = 100; // fallback
        }
      }

      return {
        x: x,
        y: 1, // Fixed y-value for horizontal layout
        size: Math.max(point.count / 10, 2), // Scale point size, minimum 2
        count: point.count,
        percent: point.percent,
        range: point.range,
      };
    });
  });

  const pieChartTIRData = $derived(
    tirPieDataFromServer && tirPieColors
      ? [
          {
            name: "Very Low (<54)",
            value: tirPieDataFromServer.severeLow,
            color: tirPieColors.severeLow,
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
            value: tirPieDataFromServer.severeHigh,
            color: tirPieColors.severeHigh,
          },
        ].filter((segment) => segment.value > 0)
      : []
  ); // Filter out segments with 0 value for cleaner pie chart
  console.log(distributionPoints);
</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  {#if data}
    <header class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
        {data.reportName}
      </h1>
      <p class="text-xs md:text-sm text-gray-600">
        Generated on: {data.generatedDate}
      </p>
    </header>

    <!-- Summary Cards and TIR Pie Chart in a grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Target Range</CardTitle><CardDescription>
              70-180 mg/dL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-bold">
              {data.tirMetrics?.percentages.target}%
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
              {(
                (data.tirMetrics?.percentages.severeLow || 0) +
                (data?.tirMetrics?.percentages?.low || 0)
              ).toFixed(1)}%
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
              {(
                (data.tirMetrics?.percentages.severeHigh || 0) +
                (data?.tirMetrics?.percentages?.high || 0)
              ).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Readings</CardTitle></CardHeader>
          <CardContent>
            <p class="text-3xl font-bold">{data.totalReadings}</p>
          </CardContent>
        </Card>
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
    <!-- Scatterplot Chart -->
    {#if scatterplotData.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          Glucose Reading Distribution (Scatterplot)
        </h2>
        <div class="h-72 md:h-96">
          <ScatterChart
            data={scatterplotData}
            x="x"
            y="y"
            r="size"
            xDomain={[40, 400]}
            yDomain={[0.5, 1.5]}
            padding={{ left: 60, right: 40, top: 20, bottom: 60 }}
          >
            <Svg>
              <Axis placement="bottom" title="Glucose Level (mg/dL)" />
              <Axis placement="left" title="" ticks={[]} />
            </Svg>
          </ScatterChart>
        </div>
        <p class="text-sm text-gray-600 mt-2">
          Point size represents the number of readings in each glucose range.
          Hover over points to see detailed information.
        </p>
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
