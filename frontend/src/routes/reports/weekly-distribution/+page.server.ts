import type { PageServerLoad } from './$types';

// Helper to get the start of the week (Monday) for a given date
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0,0,0,0); // Normalize to start of day UTC
  const day = d.getUTCDay(); // Sunday = 0, Monday = 1, ...
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday (0) to get Monday
  return new Date(d.setUTCDate(diff));
}


export const load: PageServerLoad = async ({ url }) => { // Added url
  const fetchData = async (targetDateParam?: string) => {
    await new Promise(resolve => setTimeout(resolve, 50)); 

    // Determine targetDate: use param or default to today, ensuring UTC context
    const targetDate = targetDateParam 
        ? new Date(targetDateParam + 'T00:00:00Z') 
        : new Date(new Date().setUTCHours(0,0,0,0)); // Default to today UTC midnight
    const startOfTargetWeek = getStartOfWeek(targetDate); // Use new Date(targetDate) if targetDate could be mutated

    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const weeklyDistributionData = daysOfWeek.map((dayName, index) => {
      // Simulate data for the specific week
      const dayDate = new Date(startOfTargetWeek); // Ensure startOfTargetWeek is not modified
      dayDate.setUTCDate(startOfTargetWeek.getUTCDate() + index);

      const values = Array.from({length: 20}, () => 70 + Math.random() * 100).sort((a,b) => a-b);
      return {
        day: dayName, 
        min: Math.min(...values).toFixed(0),
        q1: values[Math.floor(values.length / 4)].toFixed(0),
        median: values[Math.floor(values.length / 2)].toFixed(0),
        q3: values[Math.floor(values.length * 3 / 4)].toFixed(0),
        max: Math.max(...values).toFixed(0),
        outliers: [] 
      };
    });

    let overallAverageWeeklyTIR = { veryLow: 5, low: 10, target: 70, high: 10, veryHigh: 5 };
    if (weeklyDistributionData.length > 0) {
      const averageMedian = weeklyDistributionData.reduce((sum, day) => sum + parseFloat(day.median), 0) / weeklyDistributionData.length;
      if (averageMedian < 90) {
        overallAverageWeeklyTIR = { veryLow: 7, low: 14, target: 63, high: 11, veryHigh: 5 };
      } else if (averageMedian > 130) {
        overallAverageWeeklyTIR = { veryLow: 4, low: 8, target: 60, high: 16, veryHigh: 12 };
      }
    }
    let totalOverallTIR = Object.values(overallAverageWeeklyTIR).reduce((s, v) => s + v, 0);
    if (totalOverallTIR > 0) {
      const scale = 100 / totalOverallTIR;
      Object.keys(overallAverageWeeklyTIR).forEach(key => {
        overallAverageWeeklyTIR[key] = Math.round(overallAverageWeeklyTIR[key] * scale);
      });
      let currentSum = Object.values(overallAverageWeeklyTIR).reduce((s,v)=>s+v,0);
      if (currentSum !== 100 && overallAverageWeeklyTIR.target !== undefined) { // Check target exists
        overallAverageWeeklyTIR.target += (100 - currentSum);
         if (overallAverageWeeklyTIR.target < 0) { // if target becomes negative
            let deficit = overallAverageWeeklyTIR.target; // amount target went below 0
            overallAverageWeeklyTIR.target = 0;
             // Distribute deficit to largest other category
            let largestKeyFallback = 'low'; // Default if all others are 0 or negative
            let maxValFallback = overallAverageWeeklyTIR.low !== undefined ? overallAverageWeeklyTIR.low : -1;
            for (const key in overallAverageWeeklyTIR) {
                if (key !== 'target' && overallAverageWeeklyTIR[key] > maxValFallback) {
                    maxValFallback = overallAverageWeeklyTIR[key];
                    largestKeyFallback = key;
                }
            }
            overallAverageWeeklyTIR[largestKeyFallback] += deficit; // deficit is negative
            // ensure that largestKeyFallback does not go negative
            if(overallAverageWeeklyTIR[largestKeyFallback] < 0) overallAverageWeeklyTIR[largestKeyFallback] = 0;
            // Recalculate sum and assign any remainder to target (which is 0 now) or largest again
            let finalSumCheck = Object.values(overallAverageWeeklyTIR).reduce((s,v)=>s+v,0);
            if (finalSumCheck !== 100) {
                 overallAverageWeeklyTIR[largestKeyFallback] += (100 - finalSumCheck);
            }

         }
      } else if (currentSum !== 100) { // If target is not defined or sum still off (e.g. target was 0 and couldn't adjust)
          let largestKey = 'low'; // Default if target is not defined
          let maxVal = overallAverageWeeklyTIR.low !== undefined ? overallAverageWeeklyTIR.low : -1;
          for (const key in overallAverageWeeklyTIR) {
              if (overallAverageWeeklyTIR[key] > maxVal) {
                  maxVal = overallAverageWeeklyTIR[key];
                  largestKey = key;
              }
          }
          overallAverageWeeklyTIR[largestKey] += (100 - currentSum);
      }
       // Final check to ensure no category is negative
        Object.keys(overallAverageWeeklyTIR).forEach(key => {
            if(overallAverageWeeklyTIR[key] < 0) overallAverageWeeklyTIR[key] = 0;
        });
        // One last normalization pass to ensure sum is exactly 100 by adjusting the largest category
        let finalSum = Object.values(overallAverageWeeklyTIR).reduce((s, v) => s + v, 0);
        if (finalSum !== 100) {
            let largestKey = Object.keys(overallAverageWeeklyTIR).reduce((a, b) => overallAverageWeeklyTIR[a] > overallAverageWeeklyTIR[b] ? a : b, 'target');
            overallAverageWeeklyTIR[largestKey] += (100 - finalSum);
        }

    } else { // if totalOverallTIR is 0, set target to 100
        overallAverageWeeklyTIR = { veryLow: 0, low: 0, target: 100, high: 0, veryHigh: 0 };
    }
    
    const tirColors = {
      veryLow: 'bg-red-700', low: 'bg-red-500', target: 'bg-green-500',
      high: 'bg-yellow-400', veryHigh: 'bg-yellow-600',
    };

    return {
      reportName: "Weekly Glucose Distribution Report",
      generatedDate: new Date().toLocaleDateString(),
      selectedWeekStartDate: startOfTargetWeek.toISOString().split('T')[0],
      distributionByDay: weeklyDistributionData,
      averageWeeklyTIR: overallAverageWeeklyTIR,
      tirColors: tirColors
    };
  };

  const targetDateStr = url.searchParams.get('targetDate');
  const reportData = await fetchData(targetDateStr || undefined);
  
  return {
    weeklyDistributionReport: reportData
  };
};
