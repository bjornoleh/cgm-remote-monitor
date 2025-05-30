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
    type InsulinBreakdown,
  } from "$lib/utils/calculate/treatment-stats";
  import type { DayToDayDailyData, Thresholds } from "./types";

  interface Props {
    dailyDataPoints: DayToDayDailyData[];
    getGlucoseColor: (value: number) => string;
    getDailyInsulinBreakdown: (day: DayToDayDailyData) => InsulinBreakdown;
    thresholds: Thresholds;
  }

  let {
    dailyDataPoints,
    getGlucoseColor,
    getDailyInsulinBreakdown,
    thresholds,
  }: Props = $props();
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
          <TableCell class={getGlucoseColor(entry.averageGlucose)}>
            {entry.averageGlucose || "N/A"}
          </TableCell>
          <TableCell class="text-sm">
            {#if entry.readingsCount > 0}
              <div>{entry.minGlucose} - {entry.maxGlucose}</div>
            {:else}
              N/A
            {/if}
          </TableCell>
          <TableCell>
            {entry.readingsCount}
          </TableCell>
          <TableCell>
            {entry.stdDev ? `${entry.stdDev}` : "N/A"}
          </TableCell>
          <TableCell class="text-sm">
            {#if entry.readingsCount > 0}
              <div class="text-green-600">
                {entry.timeInRanges.percentages.target}% Target
              </div>
              <div class="text-blue-600">
                {entry.timeInRanges.percentages.target > 85
                  ? entry.timeInRanges.percentages.target
                  : 0}% TTIR
              </div>
              <div class="text-xs text-gray-500">
                ({thresholds.bgTargetBottom}-{thresholds.bgTightTargetTop} mg/dL)
              </div>
              {#if entry.timeInRanges.percentages.low + entry.timeInRanges.percentages.severeLow > 0}
                <div class="text-red-600">
                  {entry.timeInRanges.percentages.low +
                    entry.timeInRanges.percentages.severeLow}% Low
                </div>
              {/if}
              {#if entry.timeInRanges.percentages.high + entry.timeInRanges.percentages.severeHigh > 0}
                <div class="text-orange-600">
                  {entry.timeInRanges.percentages.high +
                    entry.timeInRanges.percentages.severeHigh}% High
                </div>
              {/if}
            {:else}
              N/A
            {/if}
          </TableCell>
          <TableCell class="text-right">
            {@const insulinBreakdown = getDailyInsulinBreakdown(entry)}
            <span class="font-medium">
              {formatInsulinDisplay(insulinBreakdown.total)}U
            </span>
            <div class="text-xs text-gray-500">
              B: {formatInsulinDisplay(insulinBreakdown.bolus)}U | Ba: {formatInsulinDisplay(
                insulinBreakdown.basal
              )}U
            </div>
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</div>
