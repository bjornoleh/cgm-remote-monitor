<script lang="ts">
  import type { Treatment } from "$lib/stores/client-state.svelte.ts";

  interface Props {
    treatment: Treatment;
    onSave: (treatment: Treatment) => void;
    onCancel: () => void;
  }

  let { treatment, onSave, onCancel }: Props = $props();

  // Create a copy for editing
  let editedTreatment = $state<Treatment>({ ...treatment });
  let isLoading = $state(false);
  let validationErrors = $state<Record<string, string>>({});

  // Form validation
  function validateForm(): boolean {
    validationErrors = {};

    // Event type is required
    if (!editedTreatment.eventType?.trim()) {
      validationErrors.eventType = "Event type is required";
    }

    // If insulin is provided, it should be a positive number
    if (
      editedTreatment.insulin !== undefined &&
      editedTreatment.insulin !== null
    ) {
      if (isNaN(editedTreatment.insulin) || editedTreatment.insulin < 0) {
        validationErrors.insulin = "Insulin must be a positive number";
      }
    }

    // If carbs is provided, it should be a positive number
    if (editedTreatment.carbs !== undefined && editedTreatment.carbs !== null) {
      if (isNaN(editedTreatment.carbs) || editedTreatment.carbs < 0) {
        validationErrors.carbs = "Carbs must be a positive number";
      }
    }

    // If glucose is provided, it should be a positive number
    if (
      editedTreatment.glucose !== undefined &&
      editedTreatment.glucose !== null
    ) {
      if (isNaN(editedTreatment.glucose) || editedTreatment.glucose <= 0) {
        validationErrors.glucose = "Blood glucose must be a positive number";
      }
    }

    // If protein is provided, it should be a positive number
    if (
      editedTreatment.protein !== undefined &&
      editedTreatment.protein !== null
    ) {
      if (isNaN(editedTreatment.protein) || editedTreatment.protein < 0) {
        validationErrors.protein = "Protein must be a positive number";
      }
    }

    // If fat is provided, it should be a positive number
    if (editedTreatment.fat !== undefined && editedTreatment.fat !== null) {
      if (isNaN(editedTreatment.fat) || editedTreatment.fat < 0) {
        validationErrors.fat = "Fat must be a positive number";
      }
    }

    // If duration is provided, it should be a positive number
    if (
      editedTreatment.duration !== undefined &&
      editedTreatment.duration !== null
    ) {
      if (isNaN(editedTreatment.duration) || editedTreatment.duration <= 0) {
        validationErrors.duration = "Duration must be a positive number";
      }
    }

    // If percent is provided, it should be between 0 and 1000
    if (
      editedTreatment.percent !== undefined &&
      editedTreatment.percent !== null
    ) {
      if (
        isNaN(editedTreatment.percent) ||
        editedTreatment.percent < 0 ||
        editedTreatment.percent > 1000
      ) {
        validationErrors.percent = "Percent must be between 0 and 1000";
      }
    }

    // If absolute basal is provided, it should be a positive number
    if (
      editedTreatment.absolute !== undefined &&
      editedTreatment.absolute !== null
    ) {
      if (isNaN(editedTreatment.absolute) || editedTreatment.absolute < 0) {
        validationErrors.absolute = "Basal value must be a positive number";
      }
    }

    return Object.keys(validationErrors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) {
      return;
    }

    isLoading = true;
    try {
      await onSave(editedTreatment);
    } finally {
      isLoading = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      onCancel();
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      handleSave();
    }
  }

  // Common event types for dropdown
  const eventTypes = [
    "Bolus",
    "Meal Bolus",
    "Correction Bolus",
    "Snack Bolus",
    "Carb Correction",
    "Combo Bolus",
    "Temp Basal",
    "Temp Basal Start",
    "Temp Basal End",
    "Profile Switch",
    "Site Change",
    "Sensor Start",
    "Sensor Change",
    "Pump Battery Change",
    "Insulin Change",
    "BG Check",
    "Announcement",
    "Note",
    "Question",
    "Exercise",
    "Pump",
    "Sensor",
    "Glucose",
  ];

  // Glucose types
  const glucoseTypes = ["Finger", "Sensor", "Manual"];
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
>
  <div
    class="bg-background border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto"
  >
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold">Edit Treatment</h2>
        <button
          onclick={onCancel}
          class="text-muted-foreground hover:text-foreground text-xl"
          disabled={isLoading}
        >
          ✕
        </button>
      </div>

      <form
        onsubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        class="space-y-4"
      >
        <!-- Event Type -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Event Type <span class="text-destructive">*</span>
          </label>
          <select
            bind:value={editedTreatment.eventType}
            class="w-full px-3 py-2 border border-input rounded-lg bg-background"
            disabled={isLoading}
          >
            <option value="">Select event type</option>
            {#each eventTypes as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
          {#if validationErrors.eventType}
            <p class="text-destructive text-sm mt-1">
              {validationErrors.eventType}
            </p>
          {/if}
        </div>

        <!-- Date/Time -->
        <div>
          <label class="block text-sm font-medium mb-2">Date & Time</label>
          <input
            type="datetime-local"
            value={editedTreatment.created_at
              ? new Date(editedTreatment.created_at).toISOString().slice(0, 16)
              : ""}
            onchange={(e) => {
              const value = e.currentTarget.value;
              editedTreatment.created_at = value
                ? new Date(value).toISOString()
                : "";
            }}
            class="w-full px-3 py-2 border border-input rounded-lg bg-background"
            disabled={isLoading}
          />
        </div>

        <!-- Blood Glucose -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">
              Blood Glucose (mg/dL)
            </label>
            <input
              type="number"
              bind:value={editedTreatment.glucose}
              min="0"
              step="1"
              class="w-full px-3 py-2 border border-input rounded-lg bg-background"
              disabled={isLoading}
            />
            {#if validationErrors.glucose}
              <p class="text-destructive text-sm mt-1">
                {validationErrors.glucose}
              </p>
            {/if}
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Glucose Type</label>
            <select
              bind:value={editedTreatment.glucoseType}
              class="w-full px-3 py-2 border border-input rounded-lg bg-background"
              disabled={isLoading}
            >
              <option value="">Select type</option>
              {#each glucoseTypes as type}
                <option value={type}>{type}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Insulin -->
        <div>
          <label class="block text-sm font-medium mb-2">Insulin (units)</label>
          <input
            type="number"
            bind:value={editedTreatment.insulin}
            min="0"
            step="0.1"
            class="w-full px-3 py-2 border border-input rounded-lg bg-background"
            disabled={isLoading}
          />
          {#if validationErrors.insulin}
            <p class="text-destructive text-sm mt-1">
              {validationErrors.insulin}
            </p>
          {/if}
        </div>

        <!-- Carbs and Food -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">Carbs (grams)</label>
            <input
              type="number"
              bind:value={editedTreatment.carbs}
              min="0"
              step="1"
              class="w-full px-3 py-2 border border-input rounded-lg bg-background"
              disabled={isLoading}
            />
            {#if validationErrors.carbs}
              <p class="text-destructive text-sm mt-1">
                {validationErrors.carbs}
              </p>
            {/if}
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">
              Absorption Time (minutes)
            </label>
            <input
              type="number"
              bind:value={editedTreatment.absorptionTime}
              min="0"
              step="1"
              class="w-full px-3 py-2 border border-input rounded-lg bg-background"
              disabled={isLoading}
            />
          </div>
        </div>

        <!-- Food Description -->
        <div>
          <label class="block text-sm font-medium mb-2">Food Description</label>
          <input
            type="text"
            bind:value={editedTreatment.food}
            class="w-full px-3 py-2 border border-input rounded-lg bg-background"
            disabled={isLoading}
          />
        </div>

        <!-- Protein and Fat -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">
              Protein (grams)
            </label>
            <input
              type="number"
              bind:value={editedTreatment.protein}
              min="0"
              step="0.1"
              class="w-full px-3 py-2 border border-input rounded-lg bg-background"
              disabled={isLoading}
            />
            {#if validationErrors.protein}
              <p class="text-destructive text-sm mt-1">
                {validationErrors.protein}
              </p>
            {/if}
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Fat (grams)</label>
            <input
              type="number"
              bind:value={editedTreatment.fat}
              min="0"
              step="0.1"
              class="w-full px-3 py-2 border border-input rounded-lg bg-background"
              disabled={isLoading}
            />
            {#if validationErrors.fat}
              <p class="text-destructive text-sm mt-1">
                {validationErrors.fat}
              </p>
            {/if}
          </div>
        </div>

        <!-- Duration and Percent (for temp basals) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">
              Duration (minutes)
            </label>
            <input
              type="number"
              bind:value={editedTreatment.duration}
              min="0"
              step="1"
              class="w-full px-3 py-2 border border-input rounded-lg bg-background"
              disabled={isLoading}
            />
            {#if validationErrors.duration}
              <p class="text-destructive text-sm mt-1">
                {validationErrors.duration}
              </p>
            {/if}
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Percent (%)</label>
            <input
              type="number"
              bind:value={editedTreatment.percent}
              min="0"
              max="1000"
              step="1"
              class="w-full px-3 py-2 border border-input rounded-lg bg-background"
              disabled={isLoading}
            />
            {#if validationErrors.percent}
              <p class="text-destructive text-sm mt-1">
                {validationErrors.percent}
              </p>
            {/if}
          </div>
        </div>

        <!-- Basal Value -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Basal Value (U/h)
          </label>
          <input
            type="number"
            bind:value={editedTreatment.absolute}
            min="0"
            step="0.1"
            class="w-full px-3 py-2 border border-input rounded-lg bg-background"
            disabled={isLoading}
          />
          {#if validationErrors.absolute}
            <p class="text-destructive text-sm mt-1">
              {validationErrors.absolute}
            </p>
          {/if}
        </div>

        <!-- Profile -->
        <div>
          <label class="block text-sm font-medium mb-2">Profile</label>
          <input
            type="text"
            bind:value={editedTreatment.profile}
            class="w-full px-3 py-2 border border-input rounded-lg bg-background"
            disabled={isLoading}
          />
        </div>

        <!-- Entered By -->
        <div>
          <label class="block text-sm font-medium mb-2">Entered By</label>
          <input
            type="text"
            bind:value={editedTreatment.enteredBy}
            class="w-full px-3 py-2 border border-input rounded-lg bg-background"
            disabled={isLoading}
          />
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium mb-2">Notes</label>
          <textarea
            bind:value={editedTreatment.notes}
            rows="3"
            class="w-full px-3 py-2 border border-input rounded-lg bg-background resize-vertical"
            disabled={isLoading}
          ></textarea>
        </div>

        <!-- Reason -->
        <div>
          <label class="block text-sm font-medium mb-2">Reason</label>
          <input
            type="text"
            bind:value={editedTreatment.reason}
            class="w-full px-3 py-2 border border-input rounded-lg bg-background"
            disabled={isLoading}
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            onclick={onCancel}
            class="flex-1 bg-secondary text-secondary-foreground py-2 rounded-lg hover:bg-secondary/80 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90 transition-colors"
            disabled={isLoading || Object.keys(validationErrors).length > 0}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <!-- Keyboard Shortcuts -->
        <div class="text-xs text-muted-foreground pt-2 border-t border-border">
          <kbd class="bg-muted px-1 rounded">Ctrl+Enter</kbd>
          to save •
          <kbd class="bg-muted px-1 rounded">Esc</kbd>
           to cancel
        </div>
      </form>
    </div>
  </div>
</div>

<style>
  /* Improve form styling */
  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px hsl(var(--primary));
    border-color: hsl(var(--primary));
  }

  /* Style for validation errors */
  input:invalid,
  select:invalid {
    border-color: hsl(var(--destructive));
  }

  /* Keyboard shortcut styling */
  kbd {
    font-family:
      ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono",
      Menlo, monospace;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    border: 1px solid hsl(var(--border));
  }
</style>
