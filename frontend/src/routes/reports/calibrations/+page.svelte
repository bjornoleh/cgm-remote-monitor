<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores"; // LayerChart imports
  import { Point, Axis, Svg, Tooltip, ScatterChart } from "layerchart";

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

  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  interface CalibrationEvent {
    id: string;
    timestamp: string;
    meterBg: number;
    sensorBgBefore: number;
    sensorBgAfter: number;
    slope: string;
    intercept: string;
    scale: string;
  }

  interface ReportData {
    reportName: string;
    generatedDate: string;
    dateRange?: {
      from: string;
      to: string;
    };
    calibrations: CalibrationEvent[];
    totalCalibrations?: number;
    totalMBGs?: number;
    error?: string;
  }

  let { data }: { data: { calibrationsReport: ReportData } } = $props();

  const reportDetails = $derived(data.calibrationsReport);
  const calibrationEvents = $derived(reportDetails?.calibrations || []);

  // Date range controls
  let fromDate = $state("");
  let toDate = $state("");

  // Initialize date inputs with current URL parameters or defaults
  $effect(() => {
    const urlFrom = $page.url.searchParams.get("from");
    const urlTo = $page.url.searchParams.get("to");

    if (urlFrom) {
      fromDate = new Date(parseInt(urlFrom)).toISOString().split("T")[0];
    } else {
      // Default to 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      fromDate = thirtyDaysAgo.toISOString().split("T")[0];
    }

    if (urlTo) {
      toDate = new Date(parseInt(urlTo)).toISOString().split("T")[0];
    } else {
      // Default to today
      toDate = new Date().toISOString().split("T")[0];
    }
  });

  const updateDateRange = () => {
    alert("!!!");
    const fromTimestamp = new Date(fromDate).getTime();
    const toTimestamp = new Date(toDate + "T23:59:59").getTime(); // End of day

    const url = new URL($page.url);
    url.searchParams.set("from", fromTimestamp.toString());
    url.searchParams.set("to", toTimestamp.toString());
    console.log("Navigating to:", url.toString());
    goto(url.toString());
  };
  // Data for LayerChart: Scatter plot of Meter BG vs. Sensor BG (before calibration)
  const scatterData = $derived(
    calibrationEvents.map((cal: CalibrationEvent) => ({
      x: cal.meterBg,
      y: cal.sensorBgBefore,
      timestamp: cal.timestamp, // For tooltip
    }))
  );

  // Data for LayerChart: Slope over time
  const slopeData = $derived(
    calibrationEvents
      .map((cal: CalibrationEvent) => ({
        x: new Date(cal.timestamp),
        y: parseFloat(cal.slope),
      }))
      .sort((a: any, b: any) => a.x.getTime() - b.x.getTime()) // Sort by time for line chart
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
      {#if reportDetails.dateRange}
        <p class="text-xs md:text-sm text-gray-600">
          Date Range: {reportDetails.dateRange.from} - {reportDetails.dateRange
            .to}
        </p>
      {/if}
    </header>

    <!-- Date Range Controls -->
    <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-700 mb-4">
        Date Range Filter
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div class="space-y-2">
          <Label for="from-date">From Date</Label>
          <Input id="from-date" type="date" bind:value={fromDate} />
        </div>
        <div class="space-y-2">
          <Label for="to-date">To Date</Label>
          <Input id="to-date" type="date" bind:value={toDate} />
        </div>
        <div>
          <Button on:click={updateDateRange} class="w-full md:w-auto">
            Update Report
          </Button>
        </div>
      </div>
    </div>

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
              <!-- <Svg>
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
              </Tooltip.Root> -->
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
