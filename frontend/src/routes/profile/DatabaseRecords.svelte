<script lang="ts">
  interface Props {
    currentRecord: number;
    mongoRecords: any[];
    dateInput: string;
    timeInput: string;
    onUpdate: () => void;
    onRecordChange: () => void;
    onAddRecord: () => void;
    onRemoveRecord: () => void;
    onCloneRecord: () => void;
  }

  let {
    currentRecord = $bindable(),
    mongoRecords,
    dateInput = $bindable(),
    timeInput = $bindable(),
    onUpdate,
    onRecordChange,
    onAddRecord,
    onRemoveRecord,
    onCloneRecord,
  }: Props = $props();
</script>

<div class="bg-gray-50 rounded-lg p-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-gray-900">Database Records</h2>
    <div class="flex space-x-2">
      <button
        type="button"
        onclick={onAddRecord}
        class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        ➕ Add
      </button>
      <button
        type="button"
        onclick={onRemoveRecord}
        class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        🗑️ Remove
      </button>
      <button
        type="button"
        onclick={onCloneRecord}
        class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        📋 Clone
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Record valid from:
        <div class="flex space-x-2">
          <input
            type="date"
            bind:value={dateInput}
            oninput={onUpdate}
            class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <input
            type="time"
            bind:value={timeInput}
            oninput={onUpdate}
            class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </label>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Current Record:
        <select
          bind:value={currentRecord}
          onchange={onRecordChange}
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {#each mongoRecords as record, index}
            <option value={index}>
              {new Date(record.startDate).toLocaleString()} - {record.defaultProfile}
            </option>
          {/each}
        </select>
      </label>
    </div>
  </div>
</div>
