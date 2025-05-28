<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores'; 

  import { LayerChart, Line, Point, XAxis, YAxis, Tooltip } from 'layerchart';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '$lib/components/ui/table';
  import DateRangePicker from '$lib/components/reports/DateRangePicker.svelte';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';
  import { Button } from '$lib/components/ui/button';

  let { data }: PageData = $props();

  const reportDetails = $derived(data.treatmentsReport);
  const treatmentEvents = $derived(reportDetails?.treatments || []);
  const iobChartData = $derived(reportDetails?.iobData || []);
  const currentDataStartDate = $derived(reportDetails?.dataStartDate);
  const currentDataEndDate = $derived(reportDetails?.dataEndDate);
  const activeTypesFromServer = $derived(reportDetails?.activeEventTypes || []);

  const allTreatmentTypes = ['Bolus', 'Carbs', 'Exercise', 'Temp Basal', 'Correction Bolus'];
  // Initialize selectedTreatmentTypes based on what the server reports as active (from URL)
  let selectedTreatmentTypes = $state([...activeTypesFromServer]);

  // This effect synchronizes the local checkbox state if the URL parameters change
  // (e.g., browser back/forward, or direct URL load)
  $effect(() => {
    const typesParam = $page.url.searchParams.get('types');
    if (typesParam) {
      selectedTreatmentTypes = typesParam.split(',');
    } else {
      // If no 'types' param, server defaults to all.
      // For checkbox UI, if typesParam is null, it means "all types" are active.
      // We represent "all types" for checkbox state by checking all boxes,
      // or by having selectedTreatmentTypes empty if the server treats empty `types` as all.
      // The server returns empty `activeEventTypes` if 'types' param is missing, meaning all.
      // So, client-side, `selectedTreatmentTypes` being empty means "all types selected".
      selectedTreatmentTypes = [];
    }
  });

  function handleDateChange(event: CustomEvent<{ startDate: string; endDate: string }>) {
    const { startDate, endDate } = event.detail;
    const params = new URLSearchParams($page.url.search);
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    goto(`${$page.url.pathname}?${params.toString()}`, { keepFocus: true, invalidateAll: true });
  }

  function applyTypeFilters() {
    const params = new URLSearchParams($page.url.search);
    if (selectedTreatmentTypes.length > 0 && selectedTreatmentTypes.length < allTreatmentTypes.length) {
      params.set('types', selectedTreatmentTypes.join(','));
    } else {
      // If all types are selected (represented by full array or empty array after toggleAll),
      // or no types are selected (which shouldn't happen if "all" means empty array),
      // remove the 'types' param so server defaults to all.
      params.delete('types'); 
    }
    goto(`${$page.url.pathname}?${params.toString()}`, { keepFocus: true, invalidateAll: true });
  }

  function toggleTreatmentType(type: string) {
    const index = selectedTreatmentTypes.indexOf(type);
    if (index > -1) {
      selectedTreatmentTypes.splice(index, 1);
    } else {
      selectedTreatmentTypes.push(type);
    }
  }
  
  // Checkbox state logic: If selectedTreatmentTypes is empty, it means "all" are effectively selected.
  // For the UI, we want checkboxes to reflect this "all selected" state.
  function isTypeChecked(type: string): boolean {
    if (selectedTreatmentTypes.length === 0 && activeTypesFromServer.length === 0) return true; // No filters applied = all types
    return selectedTreatmentTypes.includes(type);
  }

</script>

<div class="p-4 md:p-6 bg-gray-100 min-h-screen">
  <header class="mb-6">
    <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{reportDetails?.reportName || 'Treatments Log'}</h1>
    {#if reportDetails?.generatedDate}
      <p class="text-xs md:text-sm text-gray-600">
        Showing data from {currentDataStartDate ? new Date(currentDataStartDate+'T00:00:00Z').toLocaleDateString(undefined, {timeZone:'UTC', year: 'numeric', month: 'short', day: 'numeric'}) : 'N/A'} 
        to {currentDataEndDate ? new Date(currentDataEndDate+'T00:00:00Z').toLocaleDateString(undefined, {timeZone:'UTC', year: 'numeric', month: 'short', day: 'numeric'}) : 'N/A'}
        (Generated: {reportDetails.generatedDate})
      </p>
      <p class="text-xs text-gray-500 mt-1">
        Active Filters: {activeTypesFromServer.length > 0 ? activeTypesFromServer.join(', ') : 'All Types'}
      </p>
    {/if}
  </header>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
    <div class="md:col-span-2 bg-white shadow-md rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-700 mb-2">Select Date Range:</h3>
      <DateRangePicker on:dateChange={handleDateChange} />
    </div>
    <div class="md:col-span-1 bg-white shadow-md rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-700 mb-3">Filter by Event Type:</h3>
      <div class="space-y-2 mb-3 max-h-40 overflow-y-auto">
        {#each allTreatmentTypes as type (type)}
          <div class="flex items-center">
            <Checkbox 
              id={`filter-${type}`} 
              checked={isTypeChecked(type)}
              on:update:checked={() => toggleTreatmentType(type)}
            />
            <Label for={`filter-${type}`} class="ml-2 text-sm font-medium text-gray-700 cursor-pointer">{type}</Label>
          </div>
        {/each}
      </div>
      <Button on:click={applyTypeFilters} size="sm" class="w-full">Apply Type Filters</Button>
    </div>
  </div>

  {#if reportDetails}
    {#if iobChartData.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Simulated Insulin On Board (IOB)</h2>
        <div class="h-72 md:h-96">
          <LayerChart data={iobChartData} x="x" y="y" xDomain={null} yDomain={[0, Math.max(1, ...iobChartData.map(p => p.y)) + 1]} --tooltip-snap-to-data={true}>
            <XAxis grid={true} ticks={5} label="Time" format={(d) => new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })}/>
            <YAxis grid={true} ticks={5} label="IOB (Units)" />
            <Line class="stroke-orange-600" />
            {#each iobChartData as pt (pt.x.toISOString())}
              <Point x={new Date(pt.x)} y={pt.y} class="fill-orange-600" r={2.5} />
            {/each}
            <Tooltip let:data class="text-sm p-2 bg-white border rounded shadow-lg">
              IOB: {data.y.toFixed(1)} U at {new Date(data.x).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'})}
            </Tooltip>
          </LayerChart>
        </div>
      </div>
    {/if}

    {#if treatmentEvents.length > 0}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Treatment Log</h2>
        <Table>
          <TableCaption class="text-sm text-gray-500 mt-2">Log of events for the selected period and types.</TableCaption>
          <TableHeader> <TableRow>
              <TableHead class="w-[200px]">Timestamp</TableHead> <TableHead>Event Type</TableHead>
              <TableHead>Details</TableHead> <TableHead>Notes</TableHead>
          </TableRow> </TableHeader>
          <TableBody>
            {#each treatmentEvents as event (event.id)}
              <TableRow>
                <TableCell class="font-medium">{new Date(event.timestamp).toLocaleString(undefined, {timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                <TableCell>{event.eventType}</TableCell>
                <TableCell>{event.details}</TableCell>
                <TableCell>{event.notes || '-'}</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {:else}
      <p class="text-center text-gray-500 py-10">No treatment data available for the selected criteria.</p>
    {/if}
  {:else}
    <p class="text-center text-gray-500 py-10">Loading report details...</p>
  {/if}
</div>
