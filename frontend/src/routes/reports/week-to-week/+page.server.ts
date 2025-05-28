import type { PageServerLoad } from './$types';

// Helper to get the start of the week (Monday) for a given date
function getStartOfWeek(date: Date): Date {
  const d = new Date(date); // Creates a new Date object, so original is not modified
  // Note: getDay() and getDate() are based on local time.
  // If 'date' is already UTC midnight, this should be fine if server is also UTC.
  // For consistency, if 'date' comes from a YYYY-MM-DD string, it's treated as local midnight.
  // If it's from new Date(isoString), it's UTC.
  // The prompt uses `new Date(targetDateParam + 'T00:00:00Z')` which is UTC.
  // So, for this function to work consistently with UTC dates, it should use UTC methods.
  d.setUTCHours(0,0,0,0); // Ensure we are at UTC midnight before calculations
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setUTCDate(diff));
}

export const load: PageServerLoad = async ({ url }) => {
  const fetchData = async (targetDateParam?: string) => {
    await new Promise(resolve => setTimeout(resolve, 50));

    // targetDateParam is YYYY-MM-DD. new Date(string) treats it as local.
    // new Date(string + 'T00:00:00Z') treats it as UTC. This is correct.
    const targetDate = targetDateParam ? new Date(targetDateParam + 'T00:00:00Z') : new Date(new Date().setUTCHours(0,0,0,0)); // Default to today UTC midnight
    const startOfTargetWeek = getStartOfWeek(targetDate);

    const weeklyDataPoints = Array.from({ length: 5 }, (_, i) => { // Show target week + 2 before & 2 after
      const weekStartDate = new Date(startOfTargetWeek); // startOfTargetWeek is already UTC midnight
      weekStartDate.setUTCDate(startOfTargetWeek.getUTCDate() + (i - 2) * 7); // Adjust index for +/- 2 weeks

      const year = weekStartDate.getUTCFullYear();
      const startOfYear = new Date(Date.UTC(year, 0, 1)); 
      const dayOfYear = Math.floor((weekStartDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)); // Use Math.floor
      const weekNumber = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7);
      
      let timeInRanges = {
        veryLow: Math.round(Math.random() * 2 + 1),
        low: Math.round(Math.random() * 8 + 5),
        target: Math.round(Math.random() * 20 + 65),
        high: Math.round(Math.random() * 8 + 5),
        veryHigh: Math.round(Math.random() * 2 + 1)
      };
      let totalTIR = Object.values(timeInRanges).reduce((sum, val) => sum + val, 0);
        if (totalTIR > 0) {
            const scaleFactor = 100 / totalTIR;
            // Normalize all but one (e.g. target) then assign remainder to target
            // This is a common way to ensure sum is exactly 100 despite rounding.
            let normalizedSum = 0;
            timeInRanges.veryLow = Math.round(timeInRanges.veryLow * scaleFactor);
            normalizedSum += timeInRanges.veryLow;
            timeInRanges.low = Math.round(timeInRanges.low * scaleFactor);
            normalizedSum += timeInRanges.low;
            timeInRanges.high = Math.round(timeInRanges.high * scaleFactor);
            normalizedSum += timeInRanges.high;
            timeInRanges.veryHigh = Math.round(timeInRanges.veryHigh * scaleFactor);
            normalizedSum += timeInRanges.veryHigh;
            
            timeInRanges.target = 100 - normalizedSum; // Assign remainder to target
            // Ensure target is not negative if other categories summed > 100 due to rounding up
            if(timeInRanges.target < 0) {
                // If target is negative, it means other categories were rounded up too much.
                // Reduce the largest contributor slightly. This is a simple correction.
                let overshot = Math.abs(timeInRanges.target);
                timeInRanges.target = 0;
                // Find largest category to subtract overshot from
                let maxKey = 'high'; // default, can be any
                for (const k in timeInRanges) {
                    if (k !== 'target' && timeInRanges[k] > timeInRanges[maxKey]) maxKey = k;
                }
                timeInRanges[maxKey] -= overshot; // Subtract the amount target went negative
                if(timeInRanges[maxKey] < 0) timeInRanges[maxKey] = 0; // Ensure it doesn't go negative
                 // Recalculate target with remaining difference to ensure 100
                let finalSum = timeInRanges.veryLow + timeInRanges.low + timeInRanges.high + timeInRanges.veryHigh;
                timeInRanges.target = 100 - finalSum;

            }
        } else { // if totalTIR is 0, set target to 100
            timeInRanges = { veryLow: 0, low: 0, target: 100, high: 0, veryHigh: 0 };
        }


      return {
        weekLabel: `${year}-W${weekNumber.toString().padStart(2, '0')}`,
        startDate: weekStartDate.toISOString().split('T')[0],
        averageGlucose: 110 + Math.round(Math.random() * 30) - 15,
        trend: Math.random() > 0.5 ? (Math.random() > 0.5 ? "rising" : "falling") : "stable",
        notes: `Notes for week ${year}-W${weekNumber}.`,
        timeInRanges: timeInRanges
      };
    });

    const targetWeekData = weeklyDataPoints[2]; 
    const targetWeekTIR = targetWeekData ? targetWeekData.timeInRanges : null;
    
    const tirColors = {
        veryLow: 'bg-red-700', low: 'bg-red-500', target: 'bg-green-500',
        high: 'bg-yellow-400', veryHigh: 'bg-yellow-600',
    };

    return {
      reportName: "Week to week Glucose Report",
      generatedDate: new Date().toLocaleDateString(),
      weeklyData: weeklyDataPoints,
      targetWeekTIR: targetWeekTIR,
      tirColors: tirColors,
      selectedWeekStartDate: startOfTargetWeek.toISOString().split('T')[0]
    };
  };

  const targetDateStr = url.searchParams.get('targetDate');
  const reportData = await fetchData(targetDateStr || undefined);
  
  return {
    weekToWeekReport: reportData
  };
};
