<script lang="ts">
  import type { Treatment } from "$lib/stores/client-state.svelte.ts";

  interface Props {
    treatments: Treatment[];
    settings: any;
    timeRange: [Date, Date];
  }

  let { treatments = [], settings = {}, timeRange }: Props = $props();

  // Filter treatments to current time range
  let visibleTreatments = $derived.by(() => {
    const [start, end] = timeRange;
    return treatments
      .filter((treatment) => {
        const treatmentTime = new Date(
          treatment.timestamp || treatment.created_at
        );
        return treatmentTime >= start && treatmentTime <= end;
      })
      .sort((a, b) => {
        const aTime = new Date(a.timestamp || a.created_at);
        const bTime = new Date(b.timestamp || b.created_at);
        return bTime.getTime() - aTime.getTime();
      });
  });

  // Group treatments by type
  let treatmentGroups = $derived.by(() => {
    const groups: Record<string, Treatment[]> = {};

    visibleTreatments.forEach((treatment) => {
      const type = treatment.eventType || "Unknown";
      if (!groups[type]) groups[type] = [];
      groups[type].push(treatment);
    });

    return groups;
  });

  function formatTreatmentTime(treatment: Treatment) {
    const time = new Date(treatment.timestamp || treatment.created_at);
    if (settings.timeFormat === 24) {
      return time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return time.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getTreatmentIcon(eventType: string) {
    const icons: Record<string, string> = {
      "Meal Bolus": "🍽️",
      "Correction Bolus": "💉",
      "Carb Correction": "🍞",
      "Temp Basal": "⚡",
      Exercise: "🏃",
      "BG Check": "🩸",
      Note: "📝",
      Insulin: "💉",
      Carbs: "🍞",
    };
    return icons[eventType] || "📌";
  }

  function getTreatmentColor(eventType: string) {
    const colors: Record<string, string> = {
      "Meal Bolus": "bg-blue-100 text-blue-800 border-blue-200",
      "Correction Bolus": "bg-red-100 text-red-800 border-red-200",
      "Carb Correction": "bg-orange-100 text-orange-800 border-orange-200",
      "Temp Basal": "bg-purple-100 text-purple-800 border-purple-200",
      Exercise: "bg-green-100 text-green-800 border-green-200",
      "BG Check": "bg-gray-100 text-gray-800 border-gray-200",
      Note: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Insulin: "bg-red-100 text-red-800 border-red-200",
      Carbs: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return colors[eventType] || "bg-gray-100 text-gray-800 border-gray-200";
  }
</script>

<div class="treatments-container space-y-4">
  <h3 class="text-lg font-semibold mb-3">Recent Treatments</h3>

  {#if visibleTreatments.length === 0}
    <div class="text-muted-foreground text-sm text-center py-4">
      No treatments in the current time range
    </div>
  {:else}
    <div class="space-y-3 max-h-64 overflow-y-auto">
      {#each visibleTreatments as treatment (treatment._id)}
        <div
          class="treatment-item border rounded-lg p-3 {getTreatmentColor(
            treatment.eventType
          )}"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-lg">
                {getTreatmentIcon(treatment.eventType)}
              </span>
              <div>
                <div class="font-medium">{treatment.eventType}</div>
                <div class="text-xs opacity-75">
                  {formatTreatmentTime(treatment)}
                </div>
              </div>
            </div>

            <div class="flex flex-col items-end text-sm">
              {#if treatment.carbs}
                <span
                  class="bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded text-xs"
                >
                  {treatment.carbs}g carbs
                </span>
              {/if}
              {#if treatment.insulin}
                <span
                  class="bg-red-200 text-red-800 px-1.5 py-0.5 rounded text-xs mt-1"
                >
                  {treatment.insulin}u insulin
                </span>
              {/if}
            </div>
          </div>

          {#if treatment.notes}
            <div class="mt-2 text-xs opacity-75">
              {treatment.notes}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Summary pills -->
  {#if Object.keys(treatmentGroups).length > 0}
    <div class="flex flex-wrap gap-2 pt-2 border-t">
      {#each Object.entries(treatmentGroups) as [type, items]}
        <span
          class="pill {getTreatmentColor(type)} px-2 py-1 rounded-full text-xs"
        >
          {getTreatmentIcon(type)}
          {items.length}
        </span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .treatment-item {
    transition: all 0.2s ease-in-out;
  }

  .treatment-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .pill {
    font-weight: 500;
    border-width: 1px;
  }

  :global(.dark) .treatment-item {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
</style>
