import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const fetchData = async () => {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
    const baseDate = new Date('2024-06-03T00:00:00Z');
    const weeklyDataPoints = Array.from({ length: 4 }, (_, i) => {
      const weekStartDate = new Date(baseDate);
      weekStartDate.setDate(baseDate.getDate() + (i * 7));

      const year = weekStartDate.getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const weekNumber = Math.ceil((((weekStartDate.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);

      return {
        weekLabel: `${year}-W${weekNumber.toString().padStart(2, '0')}`,
        startDate: weekStartDate.toISOString().split('T')[0],
        averageGlucose: 110 + Math.round(Math.random() * 30) - 15,
        trend: Math.random() > 0.5 ? (Math.random() > 0.5 ? "rising" : "falling") : "stable",
        notes: `Notes for week ${i + 1}. Lorem ipsum dolor sit amet.`,
        // Simulate detailed daily data for TIR calculation for this week (e.g., 7 days)
        // For simplicity, we'll just generate one set of TIR stats for the week directly
        timeInRanges: {
          severeLow: Math.round(Math.random() * 2 + 1),
          low: Math.round(Math.random() * 8 + 5),
          target: Math.round(Math.random() * 20 + 65),
          high: Math.round(Math.random() * 8 + 5),
          severeHigh: Math.round(Math.random() * 2 + 1)
        }
      };
    });

    // Normalize TIR for the most recent week (last item in array)
    const mostRecentWeekStats = weeklyDataPoints[weeklyDataPoints.length - 1];
    if (mostRecentWeekStats) {
        let totalTIR = Object.values(mostRecentWeekStats.timeInRanges).reduce((sum, val) => sum + val, 0);
        if (totalTIR > 0) {
            const scaleFactor = 100 / totalTIR;
            mostRecentWeekStats.timeInRanges.severeLow = Math.round(mostRecentWeekStats.timeInRanges.severeLow * scaleFactor);
            mostRecentWeekStats.timeInRanges.low = Math.round(mostRecentWeekStats.timeInRanges.low * scaleFactor);
            // Keep existing high and severeHigh for now, adjust target
            let currentSumForTarget = mostRecentWeekStats.timeInRanges.severeLow +
                                      mostRecentWeekStats.timeInRanges.low +
                                      Math.round(mostRecentWeekStats.timeInRanges.high * scaleFactor) + // scale these too
                                      Math.round(mostRecentWeekStats.timeInRanges.severeHigh * scaleFactor);

            mostRecentWeekStats.timeInRanges.high = Math.round(mostRecentWeekStats.timeInRanges.high * scaleFactor);
            mostRecentWeekStats.timeInRanges.severeHigh = Math.round(mostRecentWeekStats.timeInRanges.severeHigh * scaleFactor);

            // Adjust target to make up the difference to 100
            mostRecentWeekStats.timeInRanges.target = Math.max(0, 100 - (mostRecentWeekStats.timeInRanges.severeLow + mostRecentWeekStats.timeInRanges.low + mostRecentWeekStats.timeInRanges.high + mostRecentWeekStats.timeInRanges.severeHigh));

            // Final pass to ensure sum is exactly 100, adjusting target primarily
            let finalSum = Object.values(mostRecentWeekStats.timeInRanges).reduce((s,v) => s+v,0);
            if (finalSum !== 100 && mostRecentWeekStats.timeInRanges.target >= (100-finalSum) ) {
                 mostRecentWeekStats.timeInRanges.target += (100 - finalSum);
            } else if (finalSum !== 100) { // If target adjustment is not enough, try to adjust others slightly if possible or log
                // This simple normalization might still lead to slight discrepancies.
                // A more robust iterative approach might be needed for perfect 100% sum in all edge cases.
            }
        }
      }

    return {
      reportName: "Week to week Glucose Report",
      generatedDate: new Date().toLocaleDateString(),
      weeklyData: weeklyDataPoints,
      // Provide TIR for the most recent week specifically for the pie chart
      mostRecentWeekTIR: mostRecentWeekStats ? mostRecentWeekStats.timeInRanges : null
    };
  };

  const data = await fetchData();
  return {
    weekToWeekReport: data
  };
};
