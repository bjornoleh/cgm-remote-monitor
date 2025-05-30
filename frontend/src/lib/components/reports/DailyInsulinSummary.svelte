<script lang="ts">
  import {
    formatInsulinDisplay,
    formatCarbDisplay,
    getTotalInsulin,
    convertLegacyTreatmentSummary,
    type LegacyTreatmentSummary,
  } from "$lib/utils/calculate/treatment-stats";

  interface Props {
    treatmentSummary: LegacyTreatmentSummary;
  }

  let { treatmentSummary }: Props = $props();

  // Convert legacy format to new structured format
  const structuredSummary = $derived(
    convertLegacyTreatmentSummary(treatmentSummary)
  );
</script>

<div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
  <h4 class="text-sm font-semibold text-gray-700 mb-3">Daily Summary</h4>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    <div class="space-y-2">
      <div class="flex justify-between">
        <span class="text-gray-600">Bolus insulin:</span>
        <span class="font-medium">
          {formatInsulinDisplay(structuredSummary.totals.insulin.bolus)}U
        </span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Total basal insulin:</span>
        <span class="font-medium">
          {formatInsulinDisplay(structuredSummary.totals.insulin.basal)}U
        </span>
      </div>
      <div class="flex justify-between border-t pt-2">
        <span class="text-gray-700 font-medium">Total daily insulin:</span>
        <span class="font-semibold">
          {formatInsulinDisplay(getTotalInsulin(structuredSummary))}U
        </span>
      </div>
    </div>
    <div class="space-y-2">
      <div class="flex justify-between">
        <span class="text-gray-600">Total carbs:</span>
        <span class="font-medium">
          {formatCarbDisplay(structuredSummary.totals.food.carbs)} g
        </span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Total protein:</span>
        <span class="font-medium">
          {formatCarbDisplay(structuredSummary.totals.food.protein)} g
        </span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Total fat:</span>
        <span class="font-medium">
          {formatCarbDisplay(structuredSummary.totals.food.fat)} g
        </span>
      </div>
    </div>
  </div>
</div>
