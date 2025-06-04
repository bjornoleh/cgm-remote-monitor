<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import TreatmentEditModal from "$lib/components/TreatmentEditModal.svelte";
  import TreatmentsTable from "$lib/components/TreatmentsTable.svelte";
  import {
    deleteTreatment,
    updateTreatment,
    getAPISecret,
  } from "$lib/api/treatments";
  import type { Treatment } from "$lib/stores/client-state.svelte.ts";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Badge } from "$lib/components/ui/badge";
  import * as Card from "$lib/components/ui/card";
  import * as Alert from "$lib/components/ui/alert";

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
    const urlFrom = page.url.searchParams.get("from");
    const urlTo = page.url.searchParams.get("to");

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

    const params = new URLSearchParams(page.url.searchParams);
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

<div class="space-y-6">
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
        <Button
          variant="ghost"
          size="sm"
          onclick={() => (statusMessage = null)}
          class="text-{statusMessage.type === 'success'
            ? 'green'
            : 'red'}-600 hover:text-{statusMessage.type === 'success'
            ? 'green'
            : 'red'}-800"
        >
          ✕
        </Button>
      </div>
    </div>
  {/if}

  <!-- Show date range info -->
  {#if data.success}
    <div class="text-center text-sm text-muted-foreground mb-6">
      Showing treatments from {data.data.dateRange.from.toLocaleDateString()}
      to {data.data.dateRange.to.toLocaleDateString()}
    </div>
  {/if}

  <!-- Error state -->
  {#if !data.success}
    <div class="text-center py-12">
      <div class="text-destructive text-6xl mb-4">⚠</div>
      <h2 class="text-xl font-semibold mb-2">Error Loading Treatments</h2>
      <p class="text-muted-foreground mb-4">{data.error}</p>
      <Button onclick={() => window.location.reload()}>Retry</Button>
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
          <Label for="search-input">Search</Label>
          <Input
            id="search-input"
            bind:value={searchQuery}
            type="text"
            placeholder="Search by event type, notes, entered by..."
          />
        </div>

        <!-- Event Type Filter -->
        <div>
          <Label>Event Types</Label>
          <div class="flex flex-wrap gap-2 mt-2">
            {#each eventTypes as eventType (eventType)}
              <Badge
                variant={selectedEventTypes.includes(eventType)
                  ? "default"
                  : "outline"}
                class="cursor-pointer"
                onclick={() => toggleEventType(eventType)}
              >
                {eventType}
              </Badge>
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
          <Button variant="ghost" size="sm" onclick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      {/if}
    </div>
    <!-- Treatments Table -->
    <div class="bg-card border border-border rounded-lg overflow-hidden">
      <TreatmentsTable
        treatments={filteredTreatments}
        onEdit={editTreatment}
        onDelete={confirmDelete}
      />
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
    <Card.Root class="max-w-md w-full">
      <Card.Header>
        <Card.Title>Delete Treatment</Card.Title>
        <Card.Description>
          Are you sure you want to delete this {treatmentToDelete.eventType} treatment?
          This action cannot be undone.
        </Card.Description>
      </Card.Header>

      <Card.Content>
        <Alert.Root>
          <Alert.Title>Treatment Details</Alert.Title>
          <Alert.Description>
            <div class="space-y-1 text-sm">
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
          </Alert.Description>
        </Alert.Root>
      </Card.Content>

      <Card.Footer class="flex gap-3">
        <Button
          variant="secondary"
          class="flex-1"
          onclick={() => {
            showDeleteConfirm = false;
            treatmentToDelete = null;
          }}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          class="flex-1"
          onclick={handleDeleteTreatment}
          disabled={isLoading}
        >
          {isLoading ? "Deleting..." : "Delete"}
        </Button>
      </Card.Footer>
    </Card.Root>
  </div>
{/if}
