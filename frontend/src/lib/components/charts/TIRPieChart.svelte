<script lang="ts">
  import { PieChart } from "layerchart";

  // Props definition
  type TIRSegment = {
    name: string; // e.g., 'Target', 'Low', 'High'
    value: number; // Percentage value
    color: string; // Tailwind background color class e.g., 'bg-green-500'
  };
  let { tirData = [] }: { tirData: TIRSegment[] } = $props();

  const chartData = $derived(
    tirData
      .filter((segment) => segment.value > 0)
      .map((segment) => ({
        name: segment.name,
        value: segment.value,
        color: segment.color,
      }))
  );
</script>

{#if chartData.length > 0}
  <div class="w-full h-64 md:h-80 flex flex-col items-center">
    <PieChart
      data={chartData}
      key="name"
      c="color"
      props={{
        pie: {
          motion: "spring",
        },
      }}
    />

    <!-- Custom Legend using CSS variables -->
    <div class="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
      {#each chartData as segment}
        <div class="flex items-center">
          <span class="h-3 w-3 rounded-sm mr-1.5"></span>
          <span>{segment.name} ({segment.value.toFixed(1)}%)</span>
        </div>
      {/each}
    </div>
  </div>
{:else}
  <p class="text-sm text-gray-500 text-center p-4">
    No TIR data available to display pie chart.
  </p>
{/if}
