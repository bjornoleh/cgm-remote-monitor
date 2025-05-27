<script lang="ts">
  interface Props {
    selectedTimezone: string;
    timezones: string[];
    diaInput: string;
    carbsHrInput: string;
    perGIValues: boolean;
    carbsHrHigh: string;
    carbsHrMedium: string;
    carbsHrLow: string;
    delayHigh: string;
    delayMedium: string;
    delayLow: string;
    onUpdate: () => void;
  }

  let {
    selectedTimezone = $bindable(),
    timezones,
    diaInput = $bindable(),
    carbsHrInput = $bindable(),
    perGIValues = $bindable(),
    carbsHrHigh = $bindable(),
    carbsHrMedium = $bindable(),
    carbsHrLow = $bindable(),
    delayHigh = $bindable(),
    delayMedium = $bindable(),
    delayLow = $bindable(),
    onUpdate,
  }: Props = $props();
</script>

<div>
  <h3 class="text-md font-medium text-gray-900 mb-4">Profile Settings</h3>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Timezone:
        <select
          bind:value={selectedTimezone}
          oninput={onUpdate}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Select timezone</option>
          {#each timezones as tz}
            <option value={tz}>{tz}</option>
          {/each}
        </select>
      </label>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Duration of Insulin Activity (DIA) [hours]:
        <input
          type="number"
          step="0.1"
          bind:value={diaInput}
          oninput={onUpdate}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </label>
    </div>
  </div>

  <!-- Carb Settings -->
  <div class="mt-4">
    <div class="flex items-center mb-2">
      <input
        type="checkbox"
        bind:checked={perGIValues}
        onchange={onUpdate}
        class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
      />
      <label class="ml-2 block text-sm text-gray-900">
        Use per-GI carb absorption values
      </label>
    </div>

    {#if !perGIValues}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Carb absorption rate [g/hr]:
            <input
              type="number"
              bind:value={carbsHrInput}
              oninput={onUpdate}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </label>
        </div>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            High GI carbs [g/hr]:
            <input
              type="number"
              bind:value={carbsHrHigh}
              oninput={onUpdate}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </label>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Medium GI carbs [g/hr]:
            <input
              type="number"
              bind:value={carbsHrMedium}
              oninput={onUpdate}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </label>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Low GI carbs [g/hr]:
            <input
              type="number"
              bind:value={carbsHrLow}
              oninput={onUpdate}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </label>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            High GI delay [min]:
            <input
              type="number"
              bind:value={delayHigh}
              oninput={onUpdate}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </label>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Medium GI delay [min]:
            <input
              type="number"
              bind:value={delayMedium}
              oninput={onUpdate}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </label>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Low GI delay [min]:
            <input
              type="number"
              bind:value={delayLow}
              oninput={onUpdate}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </label>
        </div>
      </div>
    {/if}
  </div>
</div>
