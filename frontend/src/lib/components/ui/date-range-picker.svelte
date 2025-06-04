<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";

  interface Props {
    title?: string;
    showDaysPresets?: boolean;
    defaultDays?: number;
    onDateChange?: (params: {
      from?: string;
      to?: string;
      days?: number;
    }) => void;
  }

  let {
    title = "Select Date Range",
    showDaysPresets = true,
    defaultDays = 7,
    onDateChange,
  }: Props = $props();

  // Date selection state
  let fromDate = $state("");
  let toDate = $state("");
  let selectedDays = $state(defaultDays);

  // Initialize date inputs with current URL parameters or defaults
  $effect(() => {
    const fromParam = $page.url.searchParams.get("from");
    const toParam = $page.url.searchParams.get("to");
    const daysParam = $page.url.searchParams.get("days");

    if (fromParam && toParam) {
      fromDate = fromParam;
      toDate = toParam;
    } else {
      const days = daysParam ? parseInt(daysParam) : defaultDays;
      selectedDays = days;
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (days - 1));

      fromDate = startDate.toISOString().split("T")[0];
      toDate = endDate.toISOString().split("T")[0];
    }
  });

  // Update URL with new date parameters
  const updateDates = () => {
    const url = new URL($page.url);

    if (fromDate && toDate) {
      url.searchParams.set("from", fromDate);
      url.searchParams.set("to", toDate);
      url.searchParams.delete("days");
    }

    if (onDateChange) {
      onDateChange({ from: fromDate, to: toDate });
    } else {
      goto(url.toString());
    }
  };

  // Set predefined day ranges
  const setDayRange = (days: number) => {
    const url = new URL($page.url);
    url.searchParams.set("days", days.toString());
    url.searchParams.delete("from");
    url.searchParams.delete("to");

    selectedDays = days;

    // Update local date inputs for display
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));

    fromDate = startDate.toISOString().split("T")[0];
    toDate = endDate.toISOString().split("T")[0];

    if (onDateChange) {
      onDateChange({ days });
    } else {
      goto(url.toString());
    }
  };
</script>

<div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-6">
  <h2 class="text-lg font-semibold text-gray-700 mb-4">{title}</h2>

  {#if showDaysPresets}
    <!-- Quick Day Selection -->
    <div class="mb-4">
      <Label class="text-sm font-medium text-gray-700 mb-2 block">
        Quick Selection
      </Label>
      <div class="flex flex-wrap gap-2">
        {#each [1, 3, 7, 14, 30] as days}
          <Button
            variant={selectedDays === days ? "default" : "outline"}
            size="sm"
            onclick={() => setDayRange(days)}
            class="text-xs"
          >
            {days === 1 ? "Today" : `${days} days`}
          </Button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Custom Date Range Selection -->
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
      <Button onclick={updateDates} class="w-full md:w-auto">
        Update Report
      </Button>
    </div>
  </div>
</div>
