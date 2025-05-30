<script lang="ts">
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table";
  import { Edit, Trash2 } from "lucide-svelte";
  import type { Treatment } from "$lib/stores/client-state.svelte.ts";

  interface Props {
    treatments: Treatment[];
    onEdit: (treatment: Treatment) => void;
    onDelete: (treatment: Treatment) => void;
  }
  let { treatments, onEdit, onDelete }: Props = $props();

  // Table column definitions
  const columns = [
    { key: "time", label: "Time" },
    { key: "eventType", label: "Event Type" },
    { key: "bloodGlucose", label: "Blood Glucose" },
    { key: "insulin", label: "Insulin" },
    { key: "carbs", label: "Carbs/Food/Time" },
    { key: "protein", label: "Protein" },
    { key: "fat", label: "Fat" },
    { key: "duration", label: "Duration" },
    { key: "percent", label: "Percent" },
    { key: "basalValue", label: "Basal Value" },
    { key: "profile", label: "Profile" },
    { key: "enteredBy", label: "Entered By" },
    { key: "notes", label: "Notes" },
    { key: "actions", label: "Actions" },
  ];

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
    return treatment.duration ? `${treatment.duration.toFixed(2)}min` : "-";
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
</script>

{#if treatments.length === 0}
  <div class="text-center py-12">
    <div class="text-muted-foreground text-4xl mb-4">📋</div>
    <h3 class="text-lg font-semibold mb-2">No Treatments Found</h3>
    <p class="text-muted-foreground">
      No treatments match your current filters.
    </p>
  </div>
{:else}
  <Table>
    <TableHeader>
      <TableRow sticky>
        {#each columns as column}
          <TableHead class="px-4 py-3 text-left text-sm font-medium">
            {column.label}
          </TableHead>
        {/each}
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each treatments as treatment (treatment._id)}
        <TableRow class="border-t border-border hover:bg-muted/50">
          <TableCell class="px-4 py-3 text-sm">
            {formatDate(treatment.created_at)}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm">
            <span
              class="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              {treatment.eventType || "-"}
            </span>
          </TableCell>
          <TableCell class="px-4 py-3 text-sm">
            {formatBloodGlucose(treatment)}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm">
            {formatInsulin(treatment)}
          </TableCell>
          <TableCell
            class="px-4 py-3 text-sm max-w-48 truncate"
            title={formatCarbs(treatment)}
          >
            {formatCarbs(treatment)}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm">
            {formatProtein(treatment)}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm">
            {formatFat(treatment)}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm">
            {formatDuration(treatment)}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm">
            {formatPercent(treatment)}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm">
            {formatBasalValue(treatment)}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm">
            {formatProfile(treatment)}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm">
            {formatEnteredBy(treatment)}
          </TableCell>
          <TableCell
            class="px-4 py-3 text-sm max-w-64 truncate"
            title={formatNotes(treatment)}
          >
            {formatNotes(treatment)}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm">
            <div class="flex gap-2">
              <button
                onclick={() => onEdit(treatment)}
                class="text-primary hover:text-primary/80 p-1 rounded-md hover:bg-primary/10 transition-colors"
                title="Edit treatment"
              >
                <Edit size={16} />
              </button>
              <button
                onclick={() => onDelete(treatment)}
                class="text-destructive hover:text-destructive/80 p-1 rounded-md hover:bg-destructive/10 transition-colors"
                title="Delete treatment"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
{/if}
