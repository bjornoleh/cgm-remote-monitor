<script lang="ts">
  interface Props {
    currentProfile: string;
    mongoRecords: any[];
    currentRecord: number;
    profileNameInput: string;
    onProfileChange: () => void;
    onUpdate: () => void;
    onAddProfile: () => void;
    onRemoveProfile: () => void;
    onCloneProfile: () => void;
  }

  let {
    currentProfile = $bindable(),
    mongoRecords,
    currentRecord,
    profileNameInput = $bindable(),
    onProfileChange,
    onUpdate,
    onAddProfile,
    onRemoveProfile,
    onCloneProfile,
  }: Props = $props();
</script>

<div class="bg-gray-50 rounded-lg p-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-gray-900">Stored Profiles</h2>
    <div class="flex space-x-2">
      <button
        type="button"
        onclick={onAddProfile}
        class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        ➕ Add
      </button>
      <button
        type="button"
        onclick={onRemoveProfile}
        class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        🗑️ Remove
      </button>
      <button
        type="button"
        onclick={onCloneProfile}
        class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        📋 Clone
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Profile Name:
        <input
          type="text"
          bind:value={profileNameInput}
          oninput={onUpdate}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </label>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Current Profile:
        <select
          bind:value={currentProfile}
          onchange={onProfileChange}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {#each Object.keys(mongoRecords[currentRecord]?.store || {}) as profileName}
            <option value={profileName}>{profileName}</option>
          {/each}
        </select>
      </label>
    </div>
  </div>
</div>
