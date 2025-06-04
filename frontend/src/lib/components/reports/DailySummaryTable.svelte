<script lang="ts">
  import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table";
  import {
    formatInsulinDisplay,
    getTotalInsulin,
  } from "$lib/utils/calculate/treatment-stats";
  import type { DayToDayDailyData, Thresholds } from "./types";
  import { getGlucoseColor } from "$lib/utils/glucose-analytics";

  interface Props {
    dailyDataPoints: DayToDayDailyData[];
    thresholds: Thresholds;
  }

  let { dailyDataPoints, thresholds }: Props = $props();
</script>

<div class="bg-white shadow-lg rounded-lg p-4 md:p-6">
  <h2 class="text-xl font-semibold text-gray-700 mb-4">Daily Summary</h2>
  <Table>
    <TableCaption class="text-sm text-gray-500 mt-2">
      Daily glucose statistics and time in range data.
    </TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead class="w-[120px]">Date</TableHead>
        <TableHead>Avg (mg/dL)</TableHead>
        <TableHead>Range</TableHead>
        <TableHead>Readings</TableHead>
        <TableHead>Std Dev</TableHead>
        <TableHead>Time in Range</TableHead>
        <TableHead class="text-right">TDD (U)</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each dailyDataPoints as entry (entry.date)}
        <TableRow>
          <TableCell class="font-medium">
            {new Date(entry.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </TableCell>
          <TableCell
            class={getGlucoseColor(entry.analytics.basicStats.mean, thresholds)}
          >
            {Math.round(entry.analytics.basicStats.mean) || "N/A"}
          </TableCell>
          <TableCell class="text-sm">
            {#if entry.readingsCount > 0}
              <div>
                {Math.round(entry.analytics.basicStats.min)} - {Math.round(
                  entry.analytics.basicStats.max
                )}
              </div>
            {:else}
              N/A
            {/if}
          </TableCell>
          <TableCell>
            {entry.readingsCount}
          </TableCell>
          <TableCell>
            {entry.analytics.basicStats.standardDeviation
              ? `${Math.round(entry.analytics.basicStats.standardDeviation)}`
              : "N/A"}
          </TableCell>
          <TableCell class="text-sm">
            {#if entry.readingsCount > 0}
              <div class="text-green-600">
                {entry.analytics.timeInRange.percentages.target}% Target
              </div>
              <div class="text-blue-600">
                {entry.analytics.timeInRange.percentages.tightTarget ??
                  entry.analytics.timeInRange.percentages.target}% TTIR
              </div>
              <div class="text-xs text-gray-500">
                ({thresholds.bgTargetBottom}-{thresholds.bgTightTargetTop} mg/dL)
              </div>
              {#if entry.analytics.timeInRange.percentages.low + entry.analytics.timeInRange.percentages.severeLow > 0}
                <div class="text-red-600">
                  {entry.analytics.timeInRange.percentages.low +
                    entry.analytics.timeInRange.percentages.severeLow}% Low
                </div>
              {/if}
              {#if entry.analytics.timeInRange.percentages.high + entry.analytics.timeInRange.percentages.severeHigh > 0}
                <div class="text-orange-600">
                  {entry.analytics.timeInRange.percentages.high +
                    entry.analytics.timeInRange.percentages.severeHigh}% High
                </div>
              {/if}
            {:else}
              N/A
            {/if}
          </TableCell>
          <TableCell class="text-right">
            <span class="font-medium">
              {formatInsulinDisplay(getTotalInsulin(entry.treatmentSummary))}U
            </span>
            <div class="text-xs text-gray-500">
              B: {formatInsulinDisplay(
                entry.treatmentSummary.totals.insulin.bolus
              )}U | Ba: {formatInsulinDisplay(
                entry.treatmentSummary.totals.insulin.basal
              )}U
            </div>
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</div>
