<script lang="ts">
  import type { Thresholds, DayToDayDailyData } from "./types";
  import { getGlucoseColor } from "$lib/utils/glucose-analytics";

  interface Props {
    dayData: DayToDayDailyData;
    thresholds: Thresholds;
  }

  let { dayData, thresholds }: Props = $props();
</script>

<div class="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
  <div class="bg-gray-50 p-3 rounded">
    <div class="text-gray-600 text-xs">Average</div>
    <div
      class="font-semibold {getGlucoseColor(
        dayData.analytics.basicStats.mean,
        thresholds
      )}"
    >
      {Math.round(dayData.analytics.basicStats.mean)} mg/dL
    </div>
  </div>
  <div class="bg-gray-50 p-3 rounded">
    <div class="text-gray-600 text-xs">Range</div>
    <div class="font-semibold">
      {Math.round(dayData.analytics.basicStats.min)} - {Math.round(
        dayData.analytics.basicStats.max
      )}
    </div>
  </div>
  <div class="bg-gray-50 p-3 rounded">
    <div class="text-gray-600 text-xs">Time in Range</div>
    <div class="font-semibold text-green-600">
      {dayData.analytics.timeInRange.percentages.target}%
    </div>
    <div class="text-xs text-gray-500">
      ({thresholds.bgTargetBottom}-{thresholds.bgTargetTop} mg/dL)
    </div>
  </div>
  <div class="bg-gray-50 p-3 rounded">
    <div class="text-gray-600 text-xs">Tight Time in Range</div>
    <div class="font-semibold text-blue-600">
      <!-- Use tight target percentage if available, otherwise fall back to regular target -->
      {dayData.analytics.timeInRange.percentages.tightTarget ??
        dayData.analytics.timeInRange.percentages.target}%
    </div>
    <div class="text-xs text-gray-500">
      ({thresholds.bgTargetBottom}-{thresholds.bgTightTargetTop} mg/dL)
    </div>
  </div>
  <div class="bg-gray-50 p-3 rounded">
    <div class="text-gray-600 text-xs">Low Events</div>
    <div class="font-semibold text-red-600">
      {dayData.analytics.timeInRange.percentages.low +
        dayData.analytics.timeInRange.percentages.severeLow}%
    </div>
  </div>
  <div class="bg-gray-50 p-3 rounded">
    <div class="text-gray-600 text-xs">High Events</div>
    <div class="font-semibold text-orange-600">
      {dayData.analytics.timeInRange.percentages.high +
        dayData.analytics.timeInRange.percentages.severeHigh}%
    </div>
  </div>
</div>
