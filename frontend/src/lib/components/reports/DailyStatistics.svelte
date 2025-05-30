<script lang="ts">
  import type { Thresholds, DayToDayDailyData } from "./types";

  interface Props {
    dayData: DayToDayDailyData;
    thresholds: Thresholds;
    getGlucoseColor: (value: number) => string;
  }

  let { dayData, thresholds, getGlucoseColor }: Props = $props();
</script>

<div class="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
  <div class="bg-gray-50 p-3 rounded">
    <div class="text-gray-600 text-xs">Average</div>
    <div class="font-semibold {getGlucoseColor(dayData.averageGlucose)}">
      {dayData.averageGlucose} mg/dL
    </div>
  </div>
  <div class="bg-gray-50 p-3 rounded">
    <div class="text-gray-600 text-xs">Range</div>
    <div class="font-semibold">
      {dayData.minGlucose} - {dayData.maxGlucose}
    </div>
  </div>
  <div class="bg-gray-50 p-3 rounded">
    <div class="text-gray-600 text-xs">Time in Range</div>
    <div class="font-semibold text-green-600">
      {dayData.timeInRanges.percentages.target}%
    </div>
    <div class="text-xs text-gray-500">
      ({thresholds.bgTargetBottom}-{thresholds.bgTargetTop} mg/dL)
    </div>
  </div>
  <div class="bg-gray-50 p-3 rounded">
    <div class="text-gray-600 text-xs">Tight Time in Range</div>
    <div class="font-semibold text-blue-600">
      <!-- Assuming tight target is calculated and available, otherwise provide a fallback -->
      {(dayData.timeInRanges.percentages.tightTarget ??
      dayData.timeInRanges.percentages.target > 85)
        ? dayData.timeInRanges.percentages.target
        : 0}%
    </div>
    <div class="text-xs text-gray-500">
      ({thresholds.bgTargetBottom}-{thresholds.tightTargetTop} mg/dL)
    </div>
  </div>
  <div class="bg-gray-50 p-3 rounded">
    <div class="text-gray-600 text-xs">Low Events</div>
    <div class="font-semibold text-red-600">
      {dayData.timeInRanges.percentages.low +
        dayData.timeInRanges.percentages.severeLow}%
    </div>
  </div>
  <div class="bg-gray-50 p-3 rounded">
    <div class="text-gray-600 text-xs">High Events</div>
    <div class="font-semibold text-orange-600">
      {dayData.timeInRanges.percentages.high +
        dayData.timeInRanges.percentages.severeHigh}%
    </div>
  </div>
</div>
