import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const fetchData = async () => {
    await new Promise(resolve => setTimeout(resolve, 50)); 

    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const weeklyDistributionData = daysOfWeek.map(day => {
      const values = Array.from({length: 20}, () => 70 + Math.random() * 100).sort((a,b) => a-b);
      return {
        day: day,
        min: Math.min(...values).toFixed(0),
        q1: values[Math.floor(values.length / 4)].toFixed(0),
        median: values[Math.floor(values.length / 2)].toFixed(0),
        q3: values[Math.floor(values.length * 3 / 4)].toFixed(0),
        max: Math.max(...values).toFixed(0),
        outliers: [] 
      };
    });

    // Simulate overall average weekly TIR based on average of daily medians
    let overallAverageWeeklyTIR = { veryLow: 5, low: 10, target: 70, high: 10, veryHigh: 5 }; // Default
    if (weeklyDistributionData.length > 0) {
      const averageMedian = weeklyDistributionData.reduce((sum, day) => sum + parseFloat(day.median), 0) / weeklyDistributionData.length;
      if (averageMedian < 90) {
        overallAverageWeeklyTIR = { veryLow: 7, low: 14, target: 63, high: 11, veryHigh: 5 };
      } else if (averageMedian > 130) {
        overallAverageWeeklyTIR = { veryLow: 4, low: 8, target: 60, high: 16, veryHigh: 12 };
      }
    }
    // Normalize overallAverageWeeklyTIR
    let totalOverallTIR = Object.values(overallAverageWeeklyTIR).reduce((s, v) => s + v, 0);
    if (totalOverallTIR > 0) {
      const scale = 100 / totalOverallTIR;
      Object.keys(overallAverageWeeklyTIR).forEach(key => {
        overallAverageWeeklyTIR[key] = Math.round(overallAverageWeeklyTIR[key] * scale);
      });
       let currentSum = Object.values(overallAverageWeeklyTIR).reduce((s,v)=>s+v,0);
      if (currentSum !== 100 && overallAverageWeeklyTIR.target) {
        overallAverageWeeklyTIR.target += (100 - currentSum);
      } else if (currentSum !== 100) { 
          // Fallback if target is not defined or doesn't resolve sum
          // Adjust the largest category if target is not present or sum is still off.
          let largestKey = null;
          let maxVal = -1;
          for (const key in overallAverageWeeklyTIR) {
              if (overallAverageWeeklyTIR[key] > maxVal) {
                  maxVal = overallAverageWeeklyTIR[key];
                  largestKey = key;
              }
          }
          if (largestKey) {
              overallAverageWeeklyTIR[largestKey] += (100 - currentSum);
          }
      }
    }
    
    const tirColors = {
      veryLow: 'bg-red-700',
      low: 'bg-red-500',
      target: 'bg-green-500',
      high: 'bg-yellow-400',
      veryHigh: 'bg-yellow-600',
    };

    return {
      reportName: "Weekly Glucose Distribution Report",
      generatedDate: new Date().toLocaleDateString(),
      distributionByDay: weeklyDistributionData,
      averageWeeklyTIR: overallAverageWeeklyTIR, // Add this
      tirColors: tirColors                     // Add this
    };
  };

  const data = await fetchData();
  return {
    weeklyDistributionReport: data
  };
};
