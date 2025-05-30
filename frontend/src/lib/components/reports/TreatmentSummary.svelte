<script lang="ts">
  import { Syringe, Apple, Utensils } from "lucide-svelte";
  import {
    formatInsulinDisplay,
    formatCarbDisplay,
  } from "$lib/utils/calculate/treatment-stats";
  import type { DayToDayDailyData } from "./types";

  interface Props {
    dailyDataPoints: DayToDayDailyData[];
  }

  let { dailyDataPoints }: Props = $props();
</script>

<div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-6">
  <h2 class="text-xl font-semibold text-gray-700 mb-4">
    Overall Treatment Summary
  </h2>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    {#each dailyDataPoints as day}
      {#if day.treatmentSummary && (day.treatmentSummary.totalInsulin > 0 || day.treatmentSummary.totalCarbs > 0)}
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-700 mb-3">
            {new Date(day.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </h3>
          <div class="space-y-2 text-sm">
            {#if day.treatmentSummary.totalInsulin > 0}
              <div class="flex items-center gap-2">
                <Syringe class="w-4 h-4 text-blue-600" />
                <span>
                  Insulin: {formatInsulinDisplay(
                    day.treatmentSummary.totalInsulin
                  )}U
                </span>
              </div>
            {/if}
            {#if day.treatmentSummary.totalCarbs > 0}
              <div class="flex items-center gap-2">
                <Apple class="w-4 h-4 text-orange-600" />
                <span>
                  Carbs: {formatCarbDisplay(day.treatmentSummary.totalCarbs)}g
                </span>
              </div>
            {/if}
            {#if day.treatmentSummary.totalProtein > 0}
              <div class="flex items-center gap-2">
                <Utensils class="w-4 h-4 text-green-600" />
                <span>
                  Protein: {formatCarbDisplay(
                    day.treatmentSummary.totalProtein
                  )}g
                </span>
              </div>
            {/if}
            {#if day.treatmentSummary.totalFat > 0}
              <div class="flex items-center gap-2">
                <Utensils class="w-4 h-4 text-yellow-600" />
                <span>
                  Fat: {formatCarbDisplay(day.treatmentSummary.totalFat)}g
                </span>
              </div>
            {/if}
            <div class="text-xs text-gray-500 mt-2">
              {day.treatmentSummary.bolusCount} bolus events •
              {day.treatmentSummary.mealEvents} meal events
            </div>
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>
