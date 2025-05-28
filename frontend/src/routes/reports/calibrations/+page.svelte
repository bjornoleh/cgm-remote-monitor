<script lang="ts">
  import type { PageData } from "./$types";

  // LayerChart imports
  import {
    Point,
    Line,
    Axis,
    Svg,
    Tooltip,
    Grid,
    ScatterChart,
  } from "layerchart";

  // ShadCN Table component imports
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableCaption,
  } from "$lib/components/ui/table";

  let { data }: PageData = $props();

  const reportDetails = $derived(data.calibrationsReport);
  const calibrationEvents = $derived(reportDetails?.calibrations || []);

  // Data for LayerChart: Scatter plot of Meter BG vs. Sensor BG (before calibration)
  const scatterData = $derived(
    calibrationEvents.map((cal) => ({
      x: cal.meterBg,
      y: cal.sensorBgBefore,
      timestamp: cal.timestamp, // For tooltip
    }))
  );

  // Data for LayerChart: Slope over time
  const slopeData = $derived(
    calibrationEvents
      .map((cal) => ({
        x: new Date(cal.timestamp),
        y: parseFloat(cal.slope),
      }))
      .sort((a, b) => a.x.getTime() - b.x.getTime()) // Sort by time for line chart
  );
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

    {#if calibrationEvents.length > 0}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-4">
            Meter BG vs. Sensor BG (Pre-Calibration)
          </h2>
          <div class="h-80 md:h-96">
            <ScatterChart data={scatterData} x="x" y="y">
              <Svg>
                <Axis
                  placement="bottom"
                  rule
                  ticks={5}
                  label="Meter BG (mg/dL)"
                />
                <Axis
                  placement="left"
                  rule
                  ticks={5}
                  label="Sensor BG (mg/dL)"
                />
                <!-- <Point class="fill-indigo-600" r={4} /> -->
                <Tooltip.Root
                  class="text-sm p-2 bg-white border rounded shadow-lg"
                >
                  {#snippet children({ data })}
                    <Tooltip.Header>
                      {new Date(data.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </Tooltip.Header>
                    <Tooltip.List>
                      <Tooltip.Item label="Meter" value={data.x} />
                      <Tooltip.Item label="Sensor" value={data.y} />
                    </Tooltip.List>
                  {/snippet}
                </Tooltip.Root>
              </Svg>
            </ScatterChart>
          </div>
        </div>
        <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-4">
            Calibration Slope Over Time
          </h2>
          <div class="h-80 md:h-96">
            <ScatterChart
              data={slopeData}
              x="x"
              y="y"
              xDomain={null}
              yDomain={null}
              --tooltip-snap-to-data={true}
            >
              <Svg>
                <Axis
                  placement="bottom"
                  rule
                  ticks={5}
                  label="Time"
                  format={(d) =>
                    new Date(d).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                />
                <Axis placement="left" rule ticks={5} label="Slope" />
                <Line class="stroke-teal-600" />
                <Point class="fill-teal-600" r={3} />
              </Svg>

              <Tooltip.Root
                class="text-sm p-2 bg-white border rounded shadow-lg"
              >
                {#snippet children({ data })}
                  <Tooltip.Header>
                    {new Date(data.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </Tooltip.Header>
                  <Tooltip.List>
                    <Tooltip.Item label="Slope" value={data.y.toFixed(3)} />
                  </Tooltip.List>
                {/snippet}
              </Tooltip.Root>
            </ScatterChart>
          </div>
        </div>
      </div>

      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          Calibration Events Log
        </h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">
            Detailed log of calibration events.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead class="text-right">Meter BG</TableHead>
              <TableHead class="text-right">Sensor (Before)</TableHead>
              <TableHead class="text-right">Sensor (After)</TableHead>
              <TableHead class="text-right">Slope</TableHead>
              <TableHead class="text-right">Intercept</TableHead>
              <TableHead class="text-right">Scale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each calibrationEvents as cal (cal.id)}
              <TableRow>
                <TableCell class="font-medium">
                  {new Date(cal.timestamp).toLocaleString()}
                </TableCell>
                <TableCell class="text-right">{cal.meterBg}</TableCell>
                <TableCell class="text-right">{cal.sensorBgBefore}</TableCell>
                <TableCell class="text-right">{cal.sensorBgAfter}</TableCell>
                <TableCell class="text-right">{cal.slope}</TableCell>
                <TableCell class="text-right">{cal.intercept}</TableCell>
                <TableCell class="text-right">{cal.scale}</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {:else}
      <p class="text-center text-gray-500 py-10">
        No calibration data available.
      </p>
    {/if}
  {:else}
    <p class="text-center text-gray-500 py-10">Loading report details...</p>
  {/if}
</div>
