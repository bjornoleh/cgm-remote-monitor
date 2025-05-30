<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import TreatmentEditModal from "$lib/components/TreatmentEditModal.svelte";
  import {
    deleteTreatment,
    updateTreatment,
    getAPISecret,
  } from "$lib/api/treatments";
  import type { Treatment } from "$lib/stores/client-state.svelte.ts";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";

  interface TreatmentReportData {
    treatments: Treatment[];
    dateRange: {
      from: Date;
      to: Date;
    };
  }

  interface Props {
    data: {
      success: boolean;
      data: TreatmentReportData;
      error?: string;
    };
  }

  let { data }: Props = $props();
  // Component state
  let selectedTreatment = $state<Treatment | null>(null);
  let showEditModal = $state(false);
  let showDeleteConfirm = $state(false);
  let treatmentToDelete = $state<Treatment | null>(null);
  let isLoading = $state(false);
  let statusMessage = $state<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  let selectedEventTypes = $state<string[]>([]);
  let searchQuery = $state("");
  // Date range controls
  let fromDate = $state("");
  let toDate = $state("");

  // Initialize date inputs with current URL parameters or defaults
  $effect(() => {
    const urlFrom = $page.url.searchParams.get("from");
    const urlTo = $page.url.searchParams.get("to");

    if (urlFrom) {
      fromDate = urlFrom;
    } else {
      // Default to 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      fromDate = thirtyDaysAgo.toISOString().split("T")[0];
    }

    if (urlTo) {
      toDate = urlTo;
    } else {
      // Default to today
      toDate = new Date().toISOString().split("T")[0];
    }
  }); // Filter state
  let filteredTreatments = $derived.by(() => {
    let filtered = data.data.treatments;

    // Filter by event type
    if (selectedEventTypes.length > 0) {
      filtered = filtered.filter((t) =>
        selectedEventTypes.includes(t.eventType || "")
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.eventType?.toLowerCase().includes(query) ||
          t.notes?.toLowerCase().includes(query) ||
          t.enteredBy?.toLowerCase().includes(query) ||
          t.reason?.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  // Get unique event types for filter
  let eventTypes = $derived.by(() => {
    const types = new Set(
      data.data.treatments.map((t) => t.eventType).filter(Boolean)
    );
    return Array.from(types).sort();
  });
  // Date range handling
  function updateDateRange() {
    if (!fromDate || !toDate) return;

    const params = new URLSearchParams($page.url.searchParams);
    params.set("from", fromDate);
    params.set("to", toDate);
    goto(`?${params.toString()}`);
  }

  // Treatment actions
  function editTreatment(treatment: Treatment) {
    selectedTreatment = treatment;
    showEditModal = true;
  }

  function confirmDelete(treatment: Treatment) {
    treatmentToDelete = treatment;
    showDeleteConfirm = true;
  }
  async function handleDeleteTreatment() {
    if (!treatmentToDelete?._id) return;

    const apiSecret = getAPISecret();
    if (!apiSecret) {
      showStatus("error", "API secret required to delete treatments");
      return;
    }

    isLoading = true;
    try {
      const result = await deleteTreatment(treatmentToDelete._id, apiSecret);
      if (result.success) {
        showStatus("success", "Treatment deleted successfully");
        // Remove from local data
        data.data.treatments = data.data.treatments.filter(
          (t) => t._id !== treatmentToDelete!._id
        );
        data = { ...data }; // Trigger reactivity
      } else {
        showStatus("error", result.error || "Failed to delete treatment");
      }
    } catch (error) {
      showStatus("error", "Failed to delete treatment");
    } finally {
      isLoading = false;
      showDeleteConfirm = false;
      treatmentToDelete = null;
    }
  }

  async function handleUpdateTreatment(updatedTreatment: Treatment) {
    if (!updatedTreatment._id) return;

    const apiSecret = getAPISecret();
    if (!apiSecret) {
      showStatus("error", "API secret required to update treatments");
      return;
    }

    isLoading = true;
    try {
      const result = await updateTreatment(
        updatedTreatment._id,
        updatedTreatment,
        apiSecret
      );
      if (result.success) {
        showStatus("success", "Treatment updated successfully");
        // Update local data
        const index = data.data.treatments.findIndex(
          (t) => t._id === updatedTreatment._id
        );
        if (index !== -1) {
          data.data.treatments[index] = { ...updatedTreatment };
          data = { ...data }; // Trigger reactivity
        }
      } else {
        showStatus("error", result.error || "Failed to update treatment");
      }
    } catch (error) {
      showStatus("error", "Failed to update treatment");
    } finally {
      isLoading = false;
      showEditModal = false;
      selectedTreatment = null;
    }
  }

  function showStatus(type: "success" | "error", text: string) {
    statusMessage = { type, text };
    setTimeout(() => {
      statusMessage = null;
    }, 5000);
  }

  // Format functions
  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  }

  function formatBloodGlucose(treatment: Treatment): string {
    if (treatment.glucose) {
      const unit = treatment.glucoseType === "Finger" ? "mg/dL" : "mg/dL";
      return `${treatment.glucose} ${unit}`;
    }
    return "-";
  }

  function formatInsulin(treatment: Treatment): string {
    if (treatment.insulin) {
      return `${treatment.insulin}U`;
    }
    return "-";
  }

  function formatCarbs(treatment: Treatment): string {
    const parts: string[] = [];

    if (treatment.carbs) {
      parts.push(`${treatment.carbs}g carbs`);
    }

    if (treatment.food) {
      parts.push(treatment.food);
    }

    if (treatment.absorptionTime) {
      parts.push(`${treatment.absorptionTime}min`);
    }

    return parts.length > 0 ? parts.join(", ") : "-";
  }

  function formatProtein(treatment: Treatment): string {
    return treatment.protein ? `${treatment.protein}g` : "-";
  }

  function formatFat(treatment: Treatment): string {
    return treatment.fat ? `${treatment.fat}g` : "-";
  }

  function formatDuration(treatment: Treatment): string {
    return treatment.duration ? `${treatment.duration}min` : "-";
  }

  function formatPercent(treatment: Treatment): string {
    return treatment.percent ? `${treatment.percent}%` : "-";
  }

  function formatBasalValue(treatment: Treatment): string {
    if (treatment.absolute !== undefined) {
      return `${treatment.absolute}U/h`;
    }
    if (treatment.rate !== undefined) {
      return `${treatment.rate}U/h`;
    }
    return "-";
  }

  function formatProfile(treatment: Treatment): string {
    return treatment.profile || "-";
  }

  function formatEnteredBy(treatment: Treatment): string {
    return treatment.enteredBy || "-";
  }

  function formatNotes(treatment: Treatment): string {
    const parts: string[] = [];

    if (treatment.notes) {
      parts.push(treatment.notes);
    }

    if (treatment.reason) {
      parts.push(`Reason: ${treatment.reason}`);
    }

    return parts.join(" | ") || "-";
  }

  // Event type filter handling
  function toggleEventType(eventType: string) {
    if (selectedEventTypes.includes(eventType)) {
      selectedEventTypes = selectedEventTypes.filter((t) => t !== eventType);
    } else {
      selectedEventTypes = [...selectedEventTypes, eventType];
    }
  }

  function clearFilters() {
    selectedEventTypes = [];
    searchQuery = "";
  }
</script>

<svelte:head>
  <title>Treatments Report - Nightscout</title>
  <meta
    name="description"
    content="View and manage all Nightscout treatments"
  />
</svelte:head>

<div class="container mx-auto px-4 py-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold">Treatments Report</h1>
      <p class="text-muted-foreground mt-1">
        View and manage all treatments from {data.data.dateRange.from.toLocaleDateString()}
        to {data.data.dateRange.to.toLocaleDateString()}
      </p>
    </div>

    <a
      href="/reports"
      class="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors"
    >
      ← Back to Reports
    </a>
  </div>

  <!-- Status Messages -->
  {#if statusMessage}
    <div
      class="bg-{statusMessage.type === 'success'
        ? 'green'
        : 'red'}-100 border border-{statusMessage.type === 'success'
        ? 'green'
        : 'red'}-200 text-{statusMessage.type === 'success'
        ? 'green'
        : 'red'}-800 px-4 py-2 rounded-lg"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm">{statusMessage.text}</span>
        <button
          onclick={() => (statusMessage = null)}
          class="text-{statusMessage.type === 'success'
            ? 'green'
            : 'red'}-600 hover:text-{statusMessage.type === 'success'
            ? 'green'
            : 'red'}-800"
        >
          ✕
        </button>
      </div>
    </div>
  {/if}

  <!-- Error state -->
  {#if !data.success}
    <div class="text-center py-12">
      <div class="text-destructive text-6xl mb-4">⚠</div>
      <h2 class="text-xl font-semibold mb-2">Error Loading Treatments</h2>
      <p class="text-muted-foreground mb-4">{data.error}</p>
      <button
        onclick={() => window.location.reload()}
        class="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        Retry
      </button>
    </div>
  {:else}
    <!-- Controls -->
    <div class="bg-card border border-border rounded-lg p-4 space-y-4">
      <!-- Date Range -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <Label for="from-date">From Date</Label>
          <Input
            id="from-date"
            type="date"
            bind:value={fromDate}
            class="w-full"
          />
        </div>
        <div>
          <Label for="to-date">To Date</Label>
          <Input id="to-date" type="date" bind:value={toDate} class="w-full" />
        </div>
        <div>
          <Button onclick={updateDateRange} class="w-full">
            Update Report
          </Button>
        </div>
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Search -->
        <div>
          <label for="search-input" class="block text-sm font-medium mb-2">
            Search
          </label>
          <input
            id="search-input"
            bind:value={searchQuery}
            type="text"
            placeholder="Search by event type, notes, entered by..."
            class="w-full px-3 py-2 border border-input rounded-lg bg-background"
          />
        </div>

        <!-- Event Type Filter -->
        <div>
          <div class="block text-sm font-medium mb-2">Event Types</div>
          <div class="flex flex-wrap gap-2">
            {#each eventTypes as eventType (eventType)}
              <button
                onclick={() => toggleEventType(eventType)}
                class="px-3 py-1 text-sm rounded-full border transition-colors {selectedEventTypes.includes(
                  eventType
                )
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'}"
              >
                {eventType}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Filter Summary -->
      {#if selectedEventTypes.length > 0 || searchQuery.trim()}
        <div class="flex items-center justify-between">
          <div class="text-sm text-muted-foreground">
            Showing {filteredTreatments.length} of {data.data.treatments.length}
            treatments
          </div>
          <button
            onclick={clearFilters}
            class="text-sm text-primary hover:text-primary/80"
          >
            Clear Filters
          </button>
        </div>
      {/if}
    </div>

    <!-- Treatments Table -->
    <div class="bg-card border border-border rounded-lg overflow-hidden">
      {#if filteredTreatments.length === 0}
        <div class="text-center py-12">
          <div class="text-muted-foreground text-4xl mb-4">📋</div>
          <h3 class="text-lg font-semibold mb-2">No Treatments Found</h3>
          <p class="text-muted-foreground">
            {data.data.treatments.length === 0
              ? "No treatments found for the selected date range."
              : "No treatments match your current filters."}
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-muted">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium">Time</th>
                <th class="px-4 py-3 text-left text-sm font-medium">
                  Event Type
                </th>
                <th class="px-4 py-3 text-left text-sm font-medium">
                  Blood Glucose
                </th>
                <th class="px-4 py-3 text-left text-sm font-medium">Insulin</th>
                <th class="px-4 py-3 text-left text-sm font-medium">
                  Carbs/Food/Time
                </th>
                <th class="px-4 py-3 text-left text-sm font-medium">Protein</th>
                <th class="px-4 py-3 text-left text-sm font-medium">Fat</th>
                <th class="px-4 py-3 text-left text-sm font-medium">
                  Duration
                </th>
                <th class="px-4 py-3 text-left text-sm font-medium">Percent</th>
                <th class="px-4 py-3 text-left text-sm font-medium">
                  Basal Value
                </th>
                <th class="px-4 py-3 text-left text-sm font-medium">Profile</th>
                <th class="px-4 py-3 text-left text-sm font-medium">
                  Entered By
                </th>
                <th class="px-4 py-3 text-left text-sm font-medium">Notes</th>
                <th class="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredTreatments as treatment (treatment._id)}
                <tr class="border-t border-border hover:bg-muted/50">
                  <td class="px-4 py-3 text-sm">
                    {formatDate(treatment.created_at)}
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <span
                      class="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      {treatment.eventType || "-"}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm">
                    {formatBloodGlucose(treatment)}
                  </td>
                  <td class="px-4 py-3 text-sm">{formatInsulin(treatment)}</td>
                  <td
                    class="px-4 py-3 text-sm max-w-48 truncate"
                    title={formatCarbs(treatment)}
                  >
                    {formatCarbs(treatment)}
                  </td>
                  <td class="px-4 py-3 text-sm">{formatProtein(treatment)}</td>
                  <td class="px-4 py-3 text-sm">{formatFat(treatment)}</td>
                  <td class="px-4 py-3 text-sm">{formatDuration(treatment)}</td>
                  <td class="px-4 py-3 text-sm">{formatPercent(treatment)}</td>
                  <td class="px-4 py-3 text-sm">
                    {formatBasalValue(treatment)}
                  </td>
                  <td class="px-4 py-3 text-sm">{formatProfile(treatment)}</td>
                  <td class="px-4 py-3 text-sm">
                    {formatEnteredBy(treatment)}
                  </td>
                  <td
                    class="px-4 py-3 text-sm max-w-64 truncate"
                    title={formatNotes(treatment)}
                  >
                    {formatNotes(treatment)}
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <div class="flex gap-2">
                      <button
                        onclick={() => editTreatment(treatment)}
                        class="text-primary hover:text-primary/80 text-sm"
                        title="Edit treatment"
                      >
                        ✏️
                      </button>
                      <button
                        onclick={() => confirmDelete(treatment)}
                        class="text-destructive hover:text-destructive/80 text-sm"
                        title="Delete treatment"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <!-- Summary Stats -->
    <div class="bg-card border border-border rounded-lg p-4">
      <h3 class="text-lg font-semibold mb-3">Summary</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold text-primary">
            {filteredTreatments.length}
          </div>
          <div class="text-sm text-muted-foreground">Total Treatments</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-blue-600">
            {filteredTreatments.filter((t: Treatment) => t.insulin).length}
          </div>
          <div class="text-sm text-muted-foreground">With Insulin</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-green-600">
            {filteredTreatments.filter((t: Treatment) => t.carbs).length}
          </div>
          <div class="text-sm text-muted-foreground">With Carbs</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-purple-600">
            {eventTypes.length}
          </div>
          <div class="text-sm text-muted-foreground">Event Types</div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Edit Modal -->
{#if showEditModal && selectedTreatment}
  <TreatmentEditModal
    treatment={selectedTreatment}
    onSave={handleUpdateTreatment}
    onCancel={() => {
      showEditModal = false;
      selectedTreatment = null;
    }}
  />
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm && treatmentToDelete}
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
  >
    <div class="bg-background border border-border rounded-lg max-w-md w-full">
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-3">Delete Treatment</h3>
        <p class="text-muted-foreground mb-4">
          Are you sure you want to delete this {treatmentToDelete.eventType} treatment?
          This action cannot be undone.
        </p>

        <div class="bg-muted p-3 rounded-lg mb-4 text-sm">
          <div>
            <strong>Time:</strong>
            {formatDate(treatmentToDelete.created_at)}
          </div>
          <div>
            <strong>Type:</strong>
            {treatmentToDelete.eventType}
          </div>
          {#if treatmentToDelete.insulin}
            <div>
              <strong>Insulin:</strong>
              {formatInsulin(treatmentToDelete)}
            </div>
          {/if}
          {#if treatmentToDelete.carbs}
            <div>
              <strong>Carbs:</strong>
              {formatCarbs(treatmentToDelete)}
            </div>
          {/if}
        </div>

        <div class="flex gap-3">
          <button
            onclick={() => {
              showDeleteConfirm = false;
              treatmentToDelete = null;
            }}
            class="flex-1 bg-secondary text-secondary-foreground py-2 rounded-lg hover:bg-secondary/80 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onclick={handleDeleteTreatment}
            class="flex-1 bg-destructive text-destructive-foreground py-2 rounded-lg hover:bg-destructive/90 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .container {
    max-width: 1400px;
  }

  /* Improve table readability */
  table {
    border-collapse: separate;
    border-spacing: 0;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 10;
  }

  /* Responsive table */
  @media (max-width: 768px) {
    .overflow-x-auto {
      font-size: 0.875rem;
    }

    th,
    td {
      padding: 0.5rem;
    }
  }
</style>
