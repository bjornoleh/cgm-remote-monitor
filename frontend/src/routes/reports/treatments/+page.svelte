<script lang="ts">
  import type { PageData } from './$types';

  // LayerChart imports
  import { LayerChart, Line, Point, XAxis, YAxis, Tooltip, Grid } from 'layerchart';
  
  // ShadCN Table component imports
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '$lib/components/ui/table';

  let { data }: PageData = $props();

  const reportDetails = $derived(data.treatmentsReport);
  const treatmentEvents = $derived(reportDetails?.treatments || []);
  const iobChartData = $derived(reportDetails?.iobData || []);

</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  {#if reportDetails}
    <header class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{reportDetails.reportName}</h1>
      <p class="text-xs md:text-sm text-gray-600">Generated on: {reportDetails.generatedDate}</p>
    </header>

    {#if iobChartData.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Simulated Insulin On Board (IOB)</h2>
        <div class="h-72 md:h-96">
          <LayerChart data={iobChartData} x="x" y="y" xDomain={null} yDomain={[0, Math.max(...iobChartData.map(p => p.y)) + 1]} --tooltip-snap-to-data={true}>
            <XAxis grid={true} ticks={5} label="Time" format={(d) => new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}/>
            <YAxis grid={true} ticks={5} label="IOB (Units)" />
            <Line class="stroke-orange-600" />
            <Point class="fill-orange-600" r={3} />
            <Tooltip let:data class="text-sm p-2 bg-white border rounded shadow-lg">
              IOB: {data.y.toFixed(1)} U at {new Date(data.x).toLocaleTimeString()}
            </Tooltip>
          </LayerChart>
        </div>
      </div>
    {/if}

    {#if treatmentEvents.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Treatment Log</h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">Log of insulin, carbs, and other events.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[200px]">Timestamp</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each treatmentEvents as event (event.id)}
              <TableRow>
                <TableCell class="font-medium">{new Date(event.timestamp).toLocaleString()}</TableCell>
                <TableCell>{event.eventType}</TableCell>
                <TableCell>{event.details}</TableCell>
                <TableCell>{event.notes || '-'}</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {:else}
      <p class="text-center text-gray-500 py-10">No treatment data available.</p>
    {/if}

  {:else}
    <p class="text-center text-gray-500 py-10">Loading report details...</p>
  {/if}
</div>
