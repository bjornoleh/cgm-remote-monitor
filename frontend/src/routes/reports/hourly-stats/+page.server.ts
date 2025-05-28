import type { PageServerLoad } from './$types';

// Helper to calculate quartiles, min, max, median from an array of numbers
function getBoxPlotStats(values: number[]): { min: number, q1: number, median: number, q3: number, max: number } {
  if (values.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  const sortedValues = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sortedValues.length / 4);
  const medianIndex = Math.floor(sortedValues.length / 2);
  const q3Index = Math.floor(sortedValues.length * 3 / 4);
  return {
    min: sortedValues[0],
    q1: sortedValues[q1Index],
    median: sortedValues[medianIndex],
    q3: sortedValues[q3Index],
    max: sortedValues[sortedValues.length - 1]
  };
}

export const load: PageServerLoad = async ({ url }) => {
  const fetchData = async (reportDateParam?: string) => {
    await new Promise(resolve => setTimeout(resolve, 50)); 

    const reportDate = reportDateParam 
      ? new Date(reportDateParam + 'T00:00:00Z') 
      : new Date(new Date().setUTCHours(0,0,0,0));
    
    const hourlyDataPoints = Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0') + ":00";
      
      const baseGlucoseForHour = 90 + Math.sin(i / 3) * 20 + Math.cos(i/6)*15; 
      const readingsThisHour = Array.from({ length: 15 }, () => 
        Math.max(40, Math.min(400, baseGlucoseForHour + (Math.random() - 0.5) * 40)) 
      );
      const boxStats = getBoxPlotStats(readingsThisHour);

      const tir = { veryLow: 0, low: 0, target: 0, high: 0, veryHigh: 0 };
      readingsThisHour.forEach(r => {
        if (r < 54) tir.veryLow++;
        else if (r < 70) tir.low++;
        else if (r <= 180) tir.target++;
        else if (r <= 250) tir.high++;
        else tir.veryHigh++;
      });
      const totalReadings = readingsThisHour.length;
      const timeInRanges = {
          veryLow: Math.round((tir.veryLow / totalReadings) * 100),
          low: Math.round((tir.low / totalReadings) * 100),
          target: Math.round((tir.target / totalReadings) * 100),
          high: Math.round((tir.high / totalReadings) * 100),
          veryHigh: Math.round((tir.veryHigh / totalReadings) * 100),
      };
      
      let currentSum = Object.values(timeInRanges).reduce((s,v)=>s+v,0);
      if (currentSum > 0 && currentSum !== 100) {
          // Adjust target to make sum 100
          let diff = 100 - currentSum;
          timeInRanges.target += diff;
          // If target becomes negative, set to 0 and accept minor discrepancy for this simulation
          if (timeInRanges.target < 0) {
              timeInRanges.target = 0;
              // Recalculate sum and if still not 100, it's a small error due to rounding other categories.
              // For simplicity, we'll leave it as is for this example.
              // A more robust solution might distribute the remaining diff to other categories.
          }
      } else if (currentSum === 0 && totalReadings > 0) { // All readings fell into one category that rounded to 0, or no readings
          timeInRanges.target = 100; // Default to 100% target if all else is 0
      }


      return {
        hourLabel: hour,
        averageGlucose: Math.round(readingsThisHour.reduce((s,v)=>s+v,0) / totalReadings),
        ...boxStats, 
        stdDev: Math.round(Math.sqrt(readingsThisHour.reduce((sq, n) => sq + Math.pow(n - (readingsThisHour.reduce((s,v)=>s+v,0) / totalReadings), 2), 0) / (totalReadings > 1 ? (totalReadings -1) : 1 )) || 0),
        timeInRanges: timeInRanges
      };
    });

    const avgDailyTIR = { veryLow: 0, low: 0, target: 0, high: 0, veryHigh: 0 };
    if (hourlyDataPoints.length > 0) {
      for (const hourStat of hourlyDataPoints) {
        avgDailyTIR.veryLow += hourStat.timeInRanges.veryLow; avgDailyTIR.low += hourStat.timeInRanges.low;
        avgDailyTIR.target += hourStat.timeInRanges.target; avgDailyTIR.high += hourStat.timeInRanges.high;
        avgDailyTIR.veryHigh += hourStat.timeInRanges.veryHigh;
      }
      const numHours = hourlyDataPoints.length;
      Object.keys(avgDailyTIR).forEach(key => avgDailyTIR[key] = Math.round(avgDailyTIR[key] / numHours));
      
      let totalAvgTIR = Object.values(avgDailyTIR).reduce((s, v) => s + v, 0);
      if (totalAvgTIR > 0) {
        const scale = 100 / totalAvgTIR;
        let normalizedSum = 0;
        const keys = ['veryLow', 'low', 'high', 'veryHigh']; 
        keys.forEach(key => { avgDailyTIR[key] = Math.round(avgDailyTIR[key] * scale); normalizedSum += avgDailyTIR[key]; });
        avgDailyTIR.target = 100 - normalizedSum;
        if (avgDailyTIR.target < 0) { 
            // If target is negative, set to 0 and distribute deficit to largest other positive category
            let deficit = avgDailyTIR.target; // This will be negative
            avgDailyTIR.target = 0;
            const positiveCategories = keys.filter(k => avgDailyTIR[k] > 0);
            if (positiveCategories.length > 0) {
                let largestCat = positiveCategories.reduce((a,b) => avgDailyTIR[a] > avgDailyTIR[b] ? a : b);
                avgDailyTIR[largestCat] += deficit; // deficit is negative
                 if(avgDailyTIR[largestCat] < 0) avgDailyTIR[largestCat] = 0; // ensure it doesn't go negative
            }
             // Recalculate sum and assign any remainder to target (which is 0 now) or largest again
            let finalSumCheck = Object.values(avgDailyTIR).reduce((s,v)=>s+v,0);
            if (finalSumCheck !== 100) {
                 avgDailyTIR.target = 100 - (avgDailyTIR.veryLow + avgDailyTIR.low + avgDailyTIR.high + avgDailyTIR.veryHigh);
            }
        }
      } else { avgDailyTIR = { veryLow: 0, low: 0, target: 100, high: 0, veryHigh: 0 }; }
    }
    
    const tirColors = {
      veryLow: 'bg-red-700', low: 'bg-red-500', target: 'bg-green-500',
      high: 'bg-yellow-400', veryHigh: 'bg-yellow-600',
    };

    return {
      reportName: "Hourly Statistics Report",
      generatedDate: new Date().toLocaleDateString(),
      reportDateUsed: reportDate.toISOString().split('T')[0],
      hourlyStats: hourlyDataPoints,
      averageDailyTIR: avgDailyTIR,
      tirColors: tirColors
    };
  };

  const reportDateParam = url.searchParams.get('reportDate');
  const reportData = await fetchData(reportDateParam || undefined);
  
  return {
    hourlyStatsReport: reportData
  };
};
