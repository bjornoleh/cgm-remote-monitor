<script lang="ts">
  // LayerChart imports -
  // Actual Pie component name/usage might differ. This is speculative.
  // It might be <Chart><Pie /></Chart> or just <PieChart />
  import { LayerChart, Pie, Tooltip, Legend } from 'layerchart';

  // Props definition
  type TIRSegment = {
    name: string; // e.g., 'Target', 'Low', 'High'
    value: number; // Percentage value
    color: string; // Tailwind background color class e.g., 'bg-green-500'
  };
  let { tirData = [] }: { tirData: TIRSegment[] } = $props();

  const chartData = $derived(tirData.filter(segment => segment.value > 0));

  // LayerChart's Pie component might take data directly and a value accessor.
  // Or it might expect pre-calculated startAngle/endAngle if doing it manually.
  // The `color` might be passed via a prop or a CSS variable if LayerChart supports it.
</script>

{#if chartData.length > 0}
  <div class="w-full h-64 md:h-80 flex flex-col items-center"> {/* Tailwind: size, flex centering */}
    <LayerChart data={chartData} 
                value="value" 
                category="name" 
                class="flex-grow"
                --tooltip-snap-to-data={true}
    >
      <Pie 
        innerRadius={0.4} 
        labelOffset={0.1}
        each={segment => ({ ...segment, class: segment.color + ' stroke-white stroke-2' })}
        let:value let:name let:percent
      >
        <!-- Default label provided by LayerChart Pie, or custom label logic here -->
        <!-- <text class="text-xs fill-current" text-anchor="middle">{name} ({percent.toFixed(1)}%)</text> -->
      </Pie>
      <Tooltip let:data class="text-sm p-2 bg-white border rounded shadow-lg">
        {data.name}: {data.value.toFixed(1)}%
      </Tooltip>
      <!-- <Legend items={chartData.map(s => ({ name: s.name, color: s.color }))} class="mt-4 text-xs" /> -->
    </LayerChart>
    
    <!-- Custom Legend using Tailwind (if LayerChart's built-in legend is not sufficient or to match ShadCN style) -->
    <div class="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
      {#each chartData as segment}
        <div class="flex items-center">
          <span class={`h-3 w-3 rounded-sm mr-1.5 ${segment.color}`}></span>
          <span>{segment.name} ({segment.value.toFixed(1)}%)</span>
        </div>
      {/each}
    </div>
  </div>
{:else}
  <p class="text-sm text-gray-500 text-center p-4">No TIR data available to display pie chart.</p>
{/if}
