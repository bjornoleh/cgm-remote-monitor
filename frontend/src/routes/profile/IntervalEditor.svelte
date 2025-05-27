<script lang="ts">
  interface Props {
    intervals: Array<{ time: string; value: number }>;
    title: string;
    unit: string;
    step?: string;
    totalBasal?: number;
    onAddInterval: (index: number) => void;
    onRemoveInterval: (index: number) => void;
    onUpdate: () => void;
  }

  let {
    intervals,
    title,
    unit,
    step = "0.1",
    totalBasal,
    onAddInterval,
    onRemoveInterval,
    onUpdate,
  }: Props = $props();
</script>

<div>
  <h3 class="text-md font-medium text-gray-900 mb-4">
    {title}
    {#if totalBasal !== undefined}
      - Total: {totalBasal} U/day
    {/if}
  </h3>
  <div class="space-y-2">
    {#each intervals || [] as interval, index}
      <div class="flex items-center space-x-2">
        <label class="block text-xs font-medium text-gray-700">
          Time:
          <input
            type="time"
            bind:value={interval.time}
            oninput={onUpdate}
            class="ml-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs"
          />
        </label>
        <label class="block text-xs font-medium text-gray-700">
          {unit}:
          <input
            type="number"
            {step}
            bind:value={interval.value}
            oninput={onUpdate}
            class="ml-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs"
          />
        </label>
        <button
          type="button"
          onclick={() => onAddInterval(index + 1)}
          class="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
        >
          ➕
        </button>
        {#if intervals.length > 1}
          <button
            type="button"
            onclick={() => onRemoveInterval(index)}
            class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            🗑️
          </button>
        {/if}
      </div>
    {/each}
  </div>
</div>
