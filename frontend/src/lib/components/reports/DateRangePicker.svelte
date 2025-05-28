<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  // Assuming ShadCN input might be useful, or fallback to native HTML5 date inputs
  // import { Input } from '$lib/components/ui/input'; // If available and suitable
  // import { Button } from '$lib/components/ui/button'; // If available

  // Component state for start and end dates
  let startDate = $state(''); // Store as YYYY-MM-DD string
  let endDate = $state('');   // Store as YYYY-MM-DD string

  const dispatch = createEventDispatcher<{ dateChange: { startDate: string; endDate: string } }>();

  function applyDateChange() {
    if (startDate && endDate) {
      // Basic validation: ensure startDate is not after endDate
      if (new Date(startDate) > new Date(endDate)) {
        alert('Start date cannot be after end date.');
        return;
      }
      dispatch('dateChange', { startDate, endDate });
    } else {
      alert('Please select both a start and an end date.');
    }
  }

  // Helper to get today's date in YYYY-MM-DD for default or reset
  // function getTodayDateString(): string { // Not explicitly used by the button, but good for reference
  //   return new Date().toISOString().split('T')[0];
  // }

  // Initialize with some defaults (e.g., past 7 days)
  $effect(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Ensure we don't re-assign if values are already set (e.g. by parent component through props if that were the case)
    // For this component, it's managing its own state, so direct assignment is fine for initialization.
    if (!startDate && !endDate) {
        startDate = sevenDaysAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
    }
    // No automatic dispatch on init to allow parent to control when data is fetched based on dates.
  });

</script>

<div class="p-4 bg-white shadow-md rounded-lg flex flex-wrap items-center gap-4">
  <div class="flex flex-col">
    <label for="startDateDRP" class="text-sm font-medium text-gray-700 mb-1">Start Date:</label>
    <!-- Using native HTML5 date picker for simplicity -->
    <input
      type="date"
      id="startDateDRP" {/* Changed ID to be more unique in case of multiple instances or other date inputs on page */}
      name="startDate"
      bind:value={startDate}
      class="border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
  <div class="flex flex-col">
    <label for="endDateDRP" class="text-sm font-medium text-gray-700 mb-1">End Date:</label>
    <input
      type="date"
      id="endDateDRP" {/* Changed ID to be more unique */}
      name="endDate"
      bind:value={endDate}
      class="border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
  <div class="flex items-end pt-5"> {/* Adjusted padding for alignment with labels */}
    <button
      on:click={applyDateChange}
      class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Apply Dates
    </button>
  </div>
</div>
