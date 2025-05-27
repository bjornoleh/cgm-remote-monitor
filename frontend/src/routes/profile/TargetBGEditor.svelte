<script lang="ts">
  interface Props {
    targetLow: Array<{ time: string; value: number }>;
    targetHigh: Array<{ time: string; value: number }>;
    onAddInterval: (index: number) => void;
    onRemoveInterval: (index: number) => void;
    onUpdate: () => void;
  }

  let {
    targetLow,
    targetHigh,
    onAddInterval,
    onRemoveInterval,
    onUpdate,
  }: Props = $props();
</script>

<div>
  <h3 class="text-md font-medium text-gray-900 mb-4">
    Target BG Ranges [mg/dL]
  </h3>
  <div class="space-y-2">
    {#each targetLow || [] as lowInterval, index}
      {@const highInterval = targetHigh?.[index]}
      <div class="flex items-center space-x-2">
        <label class="block text-xs font-medium text-gray-700">
          Time:
          <input
            type="time"
            bind:value={lowInterval.time}
            oninput={() => {
              if (highInterval) highInterval.time = lowInterval.time;
              onUpdate();
            }}
            class="ml-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs"
          />
        </label>
        <label class="block text-xs font-medium text-gray-700">
          Low:
          <input
            type="number"
            step="1"
            bind:value={lowInterval.value}
            oninput={onUpdate}
            class="ml-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs"
          />
        </label>
        <label class="block text-xs font-medium text-gray-700">
          High:
          <input
            type="number"
            step="1"
            bind:value={highInterval.value}
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
        {#if targetLow.length > 1}
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
