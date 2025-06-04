<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import DateRangePicker from "$lib/components/ui/date-range-picker.svelte";

  interface Props {
    children: any;
  }

  let { children }: Props = $props();

  // Extract report name from the URL
  const reportName = $derived.by(() => {
    const pathSegments = $page.url.pathname.split("/");
    const reportSegment = pathSegments[pathSegments.length - 1];

    if (!reportSegment || reportSegment === "reports") {
      return "Reports";
    }

    // Convert kebab-case to title case
    return (
      reportSegment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ") + " Report"
    );
  });

  // Common date handling function that can be used by child components
  const handleDateChange = (params: {
    from?: string;
    to?: string;
    days?: number;
  }) => {
    const url = new URL($page.url);

    if (params.from && params.to) {
      url.searchParams.set("from", params.from);
      url.searchParams.set("to", params.to);
      url.searchParams.delete("days");
    } else if (params.days) {
      url.searchParams.set("days", params.days.toString());
      url.searchParams.delete("from");
      url.searchParams.delete("to");
    }

    goto(url.toString());
  };

  // Determine if we should show the date picker (not on main reports page)
  const showDatePicker = $derived($page.url.pathname !== "/reports");

  // Check if this is the treatments page (which has its own date picker implementation)
  const isTreatmentsPage = $derived($page.url.pathname.includes("/treatments"));
</script>

<svelte:head>
  <title>{reportName} - Nightscout</title>
  <meta
    name="description"
    content="Nightscout {reportName.toLowerCase()} with comprehensive data analysis and filtering capabilities"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<div class="min-h-screen bg-background">
  {#if $page.url.pathname !== "/reports"}
    <!-- Report Header -->
    <div class="border-b border-border bg-card">
      <div class="container mx-auto px-4 py-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-3xl font-bold text-foreground">{reportName}</h1>
            <p class="text-muted-foreground mt-1">
              Comprehensive data analysis and insights
            </p>
          </div>

          <a
            href="/reports"
            class="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors inline-flex items-center gap-2"
          >
            <span>←</span>
            <span>Back to Reports</span>
          </a>
        </div>
        <!-- Date Range Picker - only show for non-treatments pages -->
        {#if showDatePicker && !isTreatmentsPage}
          <div class="bg-background border border-border rounded-lg p-4">
            <DateRangePicker
              title="Select Report Date Range"
              onDateChange={handleDateChange}
              defaultDays={7}
            />
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Main Content -->
  <main class="container mx-auto px-4 py-6">
    {@render children()}
  </main>
</div>

<style>
  .container {
    max-width: 1400px;
  }

  /* Ensure consistent spacing and responsive design */
  @media (max-width: 768px) {
    .container {
      padding-left: 1rem;
      padding-right: 1rem;
    }
  }
</style>
