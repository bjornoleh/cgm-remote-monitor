<script lang="ts">
  import type { PageData } from "./$types";
  import { getClientState } from "$lib/stores/client-state.svelte.ts";

  // Import new components
  import GlucoseChart from "$lib/components/reports/GlucoseChart.svelte";
  import DailyStatistics from "$lib/components/reports/DailyStatistics.svelte";
  import DailyInsulinSummary from "$lib/components/reports/DailyInsulinSummary.svelte";
  import TreatmentEvents from "$lib/components/reports/TreatmentEvents.svelte";
  import PeriodAverages from "$lib/components/reports/PeriodAverages.svelte";
  import TreatmentSummary from "$lib/components/reports/TreatmentSummary.svelte";
  import DailySummaryTable from "$lib/components/reports/DailySummaryTable.svelte";
  import type { Thresholds } from "$lib/components/reports/types";
  let { data }: { data: PageData } = $props();
  const reportDetails = $derived(data.dayTodayReport);
  const dailyDataPoints = $derived(reportDetails?.dailyData || []);

  // Access client state for thresholds
  const clientState = getClientState();
  // Derive thresholds with fallbacks to match existing hardcoded values
  const thresholds: Thresholds = $derived.by(() => ({
    bgSevereLow: clientState.settings?.thresholds?.bgSevereLow || 54,
    bgLow: clientState.settings?.thresholds?.bgLow || 70,
    bgTargetBottom: clientState.settings?.thresholds?.bgTargetBottom || 70,
    bgTargetTop: clientState.settings?.thresholds?.bgTargetTop || 180,
    bgTightTargetTop: 140, // For tight time in range calculations
    bgHigh: clientState.settings?.thresholds?.bgHigh || 180,
    bgSevereHigh: clientState.settings?.thresholds?.bgSevereHigh || 250,
  }));

  // Prepare data for individual day charts
  const dailyChartData = $derived(
    dailyDataPoints.map((day) => ({
      ...day,
      chartData: day.glucoseData.map((reading) => ({
        timestamp: reading.timestamp,
        date: new Date(reading.timestamp),
        glucoseValue: reading.glucoseValue,
        timeString: reading.timeString,
        _id: reading._id,
      })),
      treatmentData: day.treatments.map((treatment) => ({
        timestamp: treatment.timestamp,
        date: new Date(treatment.timestamp),
        glucoseValue: treatment.glucoseContext || 150,
        eventType: treatment.eventType,
        insulin: treatment.insulin,
        carbs: treatment.carbs,
        protein: treatment.protein,
        fat: treatment.fat,
        notes: treatment.notes,
        _id: treatment._id,
      })),
    }))
  );

  // Calculate overall averages - use server data directly
  const overallAverages = $derived.by(() => {
    if (dailyDataPoints.length === 0) return null;

    const totals = dailyDataPoints.reduce(
      (acc, day) => {
        const treatmentSummary = day.treatmentSummary;
        const totalDailyInsulin = treatmentSummary.totalInsulin;
        const bolusInsulin = treatmentSummary.bolusInsulin || 0;
        const basalInsulin = treatmentSummary.basalInsulin || 0;

        return {
          totalDailyInsulin: acc.totalDailyInsulin + totalDailyInsulin,
          bolusInsulin: acc.bolusInsulin + bolusInsulin,
          basalInsulin: acc.basalInsulin + basalInsulin,
          totalCarbs: acc.totalCarbs + treatmentSummary.totalCarbs,
          totalProtein: acc.totalProtein + treatmentSummary.totalProtein,
          totalFat: acc.totalFat + treatmentSummary.totalFat,
          timeInRange: acc.timeInRange + day.timeInRanges.percentages.target,
          tightTimeInRange:
            acc.tightTimeInRange +
            (day.timeInRanges.percentages.target > 85
              ? day.timeInRanges.percentages.target
              : 0),
          daysWithData: acc.daysWithData + (totalDailyInsulin > 0 ? 1 : 0),
        };
      },
      {
        totalDailyInsulin: 0,
        bolusInsulin: 0,
        basalInsulin: 0,
        totalCarbs: 0,
        totalProtein: 0,
        totalFat: 0,
        timeInRange: 0,
        tightTimeInRange: 0,
        daysWithData: 0,
      }
    );

    const avgTotalDaily =
      totals.daysWithData > 0
        ? totals.totalDailyInsulin / totals.daysWithData
        : 0;
    const avgBolus =
      totals.daysWithData > 0 ? totals.bolusInsulin / totals.daysWithData : 0;
    const avgBasal =
      totals.daysWithData > 0 ? totals.basalInsulin / totals.daysWithData : 0;

    return {
      avgTotalDaily,
      avgBolus,
      avgBasal,
      bolusPercentage: avgTotalDaily > 0 ? (avgBolus / avgTotalDaily) * 100 : 0,
      basalPercentage: avgTotalDaily > 0 ? (avgBasal / avgTotalDaily) * 100 : 0,
      avgCarbs:
        totals.daysWithData > 0 ? totals.totalCarbs / totals.daysWithData : 0,
      avgProtein:
        totals.daysWithData > 0 ? totals.totalProtein / totals.daysWithData : 0,
      avgFat:
        totals.daysWithData > 0 ? totals.totalFat / totals.daysWithData : 0,
      avgTimeInRange:
        totals.daysWithData > 0 ? totals.timeInRange / totals.daysWithData : 0,
      avgTightTimeInRange:
        totals.daysWithData > 0
          ? totals.tightTimeInRange / totals.daysWithData
          : 0,
    };
  });
</script>

{#if reportDetails}
  {#if reportDetails.generatedDate}
    <div class="text-center text-sm text-muted-foreground mb-6">
      Generated on: {reportDetails.generatedDate}
      {#if reportDetails.dateRange}
        • Date Range: {reportDetails.dateRange.from} - {reportDetails.dateRange
          .to}
      {/if}
      {#if reportDetails.totalDays && reportDetails.totalReadings}
        • {reportDetails.totalDays} days • {reportDetails.totalReadings} total readings
      {/if}
    </div>
  {/if}

  {#if reportDetails.error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <h3 class="text-red-800 font-semibold">Error Loading Data</h3>
      <p class="text-red-600">{reportDetails.error}</p>
    </div>
  {:else if dailyDataPoints.length > 0}
    <!-- Individual Daily Charts -->
    {#each dailyChartData as dayData (dayData.date)}
      <div class="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          {new Date(dayData.date).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          <span class="text-sm font-normal text-gray-500 ml-2">
            ({dayData.readingsCount} readings)
          </span>
        </h2>
        {#if dayData.readingsCount > 0}
          <GlucoseChart
            chartData={dayData.chartData}
            date={dayData.date}
            {thresholds}
          />
          <DailyStatistics {dayData} {thresholds} />
          <DailyInsulinSummary treatmentSummary={dayData.treatmentSummary} />
          <TreatmentEvents treatments={dayData.treatmentData} />
        {:else}
          <div class="flex items-center justify-center h-32 text-gray-500">
            No glucose data available for this day
          </div>
        {/if}
      </div>
    {/each}
    <!-- Period Averages Summary -->
    {#if overallAverages}
      <PeriodAverages averages={overallAverages} {thresholds} />
    {/if}
    <TreatmentSummary {dailyDataPoints} />
    <DailySummaryTable {dailyDataPoints} {thresholds} />
  {:else}
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h3 class="text-yellow-800 font-semibold">No Data Available</h3>
      <p class="text-yellow-600">
        No glucose data found for the selected date range. Please check your
        date selection or ensure glucose data is being uploaded to your
        Nightscout instance.
      </p>
    </div>
  {/if}
{:else}
  <div class="flex items-center justify-center py-20">
    <div class="text-center">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
      ></div>
      <p class="text-gray-500">Loading report details...</p>
    </div>
  </div>
{/if}
