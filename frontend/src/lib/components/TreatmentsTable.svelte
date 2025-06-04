<script lang="ts">
  import { Button } from "$lib/components/ui/button";
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
  const allColumns = [
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

  // Function to check if a column has any data
  function hasColumnData(columnKey: string, treatments: Treatment[]): boolean {
    if (columnKey === "time" || columnKey === "actions") {
      return true; // Always show time and actions columns
    }

    return treatments.some((treatment) => {
      switch (columnKey) {
        case "eventType":
          return treatment.eventType && treatment.eventType.trim() !== "";
        case "bloodGlucose":
          return treatment.glucose !== undefined && treatment.glucose !== null;
        case "insulin":
          return treatment.insulin !== undefined && treatment.insulin !== null;
        case "carbs":
          return (
            (treatment.carbs !== undefined && treatment.carbs !== null) ||
            (treatment.food !== undefined && treatment.food !== null) ||
            (treatment.absorptionTime !== undefined &&
              treatment.absorptionTime !== null)
          );
        case "protein":
          return treatment.protein !== undefined && treatment.protein !== null;
        case "fat":
          return treatment.fat !== undefined && treatment.fat !== null;
        case "duration":
          return (
            treatment.duration !== undefined && treatment.duration !== null
          );
        case "percent":
          return treatment.percent !== undefined && treatment.percent !== null;
        case "basalValue":
          return (
            (treatment.absolute !== undefined && treatment.absolute !== null) ||
            (treatment.rate !== undefined && treatment.rate !== null)
          );
        case "profile":
          return treatment.profile && treatment.profile.trim() !== "";
        case "enteredBy":
          return treatment.enteredBy && treatment.enteredBy.trim() !== "";
        case "notes":
          return (
            (treatment.notes && treatment.notes.trim() !== "") ||
            (treatment.reason && treatment.reason.trim() !== "")
          );
        default:
          return false;
      }
    });
  }

  // Filter columns to only show those with data
  const visibleColumns = $derived(
    allColumns.filter((column) => hasColumnData(column.key, treatments))
  );

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
      <TableRow class="sticky top-0 bg-background">
        {#each visibleColumns as column}
          <TableHead class="px-4 py-3 text-left text-sm font-medium">
            {column.label}
          </TableHead>
        {/each}
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each treatments as treatment (treatment._id)}
        <TableRow class="border-t border-border hover:bg-muted/50">
          {#each visibleColumns as column}
            <TableCell
              class={`px-4 py-3 text-sm ${column.key === "carbs" ? "max-w-48 truncate" : ""} ${column.key === "notes" ? "max-w-64 truncate" : ""}`}
              title={column.key === "carbs"
                ? formatCarbs(treatment)
                : column.key === "notes"
                  ? formatNotes(treatment)
                  : undefined}
            >
              {#if column.key === "time"}
                {formatDate(treatment.created_at)}
              {:else if column.key === "eventType"}
                <span
                  class="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {treatment.eventType || "-"}
                </span>
              {:else if column.key === "bloodGlucose"}
                {formatBloodGlucose(treatment)}
              {:else if column.key === "insulin"}
                {formatInsulin(treatment)}
              {:else if column.key === "carbs"}
                {formatCarbs(treatment)}
              {:else if column.key === "protein"}
                {formatProtein(treatment)}
              {:else if column.key === "fat"}
                {formatFat(treatment)}
              {:else if column.key === "duration"}
                {formatDuration(treatment)}
              {:else if column.key === "percent"}
                {formatPercent(treatment)}
              {:else if column.key === "basalValue"}
                {formatBasalValue(treatment)}
              {:else if column.key === "profile"}
                {formatProfile(treatment)}
              {:else if column.key === "enteredBy"}
                {formatEnteredBy(treatment)}
              {:else if column.key === "notes"}
                {formatNotes(treatment)}
              {:else if column.key === "actions"}
                <div class="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => onEdit(treatment)}
                    class="h-8 w-8 p-0"
                    title="Edit treatment"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => onDelete(treatment)}
                    class="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    title="Delete treatment"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              {/if}
            </TableCell>
          {/each}
        </TableRow>
      {/each}
    </TableBody>
  </Table>
{/if}
