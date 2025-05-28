import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => { // Added url
  const fetchData = async (startDateParam?: string, endDateParam?: string) => {
    await new Promise(resolve => setTimeout(resolve, 50)); 

    let currentStartDate: Date;
    let currentEndDate: Date;

    if (startDateParam && endDateParam) {
      currentStartDate = new Date(startDateParam + 'T00:00:00Z');
      currentEndDate = new Date(endDateParam + 'T23:59:59Z');
    } else {
      // Default to last 7 days
      currentEndDate = new Date(); // Local time, but then set to UTC
      currentStartDate = new Date(); // Local time
      currentStartDate.setUTCDate(currentEndDate.getUTCDate() - 6); // Use UTCDate for consistency if currentEndDate becomes UTC
      currentStartDate.setUTCHours(0,0,0,0);
      currentEndDate.setUTCHours(23,59,59,999); // Set currentEndDate to UTC EOD
    }

    // timePoints remain 24h cycle, but data represents average over selected period
    const timePoints = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

    const generatePercentileSeries = (baseValue: number, variability: number) => {
      // Simulate data that would be an "average" over the selected date range
      // For this simulation, the date range effect is minor, just to show it's considered
      const dateRangeFactor = (currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7); // factor based on 7 days
      return timePoints.map((time, index) => ({
        x: time,
        y: Math.round(baseValue + (Math.random() - 0.5) * variability * (0.8 + dateRangeFactor*0.2) + Math.sin(index / 3) * (variability / 4))
      }));
    };

    const percentileData = {
      '10th': generatePercentileSeries(70, 10),
      '25th': generatePercentileSeries(85, 15),
      '50th (Median)': generatePercentileSeries(100, 20),
      '75th': generatePercentileSeries(125, 25),
      '90th': generatePercentileSeries(150, 30),
    };
    
    const summaryTable = Object.keys(percentileData).map(key => {
        const values = percentileData[key].map(p => p.y);
        return {
            percentile: key,
            min: Math.min(...values),
            avg: (values.reduce((a,b) => a+b,0)/values.length).toFixed(1),
            max: Math.max(...values)
        };
    });

    let overallAverageTIR = { veryLow: 5, low: 10, target: 70, high: 10, veryHigh: 5 };
    const medianSeries = percentileData['50th (Median)'];
    if (medianSeries) {
      const averageMedianGlucose = medianSeries.reduce((sum, p) => sum + p.y, 0) / medianSeries.length;
      if (averageMedianGlucose < 90) {
        overallAverageTIR = { veryLow: 8, low: 15, target: 60, high: 12, veryHigh: 5 };
      } else if (averageMedianGlucose > 130) {
        overallAverageTIR = { veryLow: 3, low: 7, target: 60, high: 15, veryHigh: 15 };
      }
    }
    let totalOverallTIR = Object.values(overallAverageTIR).reduce((s, v) => s + v, 0);
    if (totalOverallTIR > 0) {
      const scale = 100 / totalOverallTIR;
      // Apply scaling to all categories
      Object.keys(overallAverageTIR).forEach(key => {
        overallAverageTIR[key] = Math.round(overallAverageTIR[key] * scale);
      });
      // Adjust to ensure sum is exactly 100
      let currentSum = Object.values(overallAverageTIR).reduce((s,v)=>s+v,0);
      if (currentSum !== 100) {
          const diff = 100 - currentSum;
          // Try to adjust 'target' first if it exists
          if (overallAverageTIR.target !== undefined) {
              if (overallAverageTIR.target + diff >= 0) {
                overallAverageTIR.target += diff;
              } else { // If target would go negative, set target to 0 and distribute remaining diff
                  let remainingDiff = diff + overallAverageTIR.target; // diff to be distributed among others
                  overallAverageTIR.target = 0;
                  // Distribute remainingDiff to largest other category
                  let largestKey = null;
                  let maxVal = -1;
                  for (const key in overallAverageTIR) {
                      if (key !== 'target' && overallAverageTIR[key] > maxVal) {
                          maxVal = overallAverageTIR[key];
                          largestKey = key;
                      }
                  }
                  if (largestKey) overallAverageTIR[largestKey] += remainingDiff;
                  // Final check, sum again and if still not 100, put into largest category again if possible
                   let finalSumCheck = Object.values(overallAverageTIR).reduce((s,v)=>s+v,0);
                   if(finalSumCheck !== 100 && largestKey) overallAverageTIR[largestKey] += (100 - finalSumCheck);


              }
          } else { // If 'target' is not a key, adjust the largest category
              let largestKey = null;
              let maxVal = -1;
              for (const key in overallAverageTIR) {
                  if (overallAverageTIR[key] > maxVal) {
                      maxVal = overallAverageTIR[key];
                      largestKey = key;
                  }
              }
              if (largestKey) overallAverageTIR[largestKey] += diff;
          }
      }
       // Final pass to ensure no category is negative and sum is 100
        let finalSum = 0;
        Object.keys(overallAverageTIR).forEach(key => {
            if(overallAverageTIR[key] < 0) overallAverageTIR[key] = 0;
            finalSum += overallAverageTIR[key];
        });
        if(finalSum !== 100) { // If sum is not 100 after flooring negatives, add remainder to target or largest
            const remainder = 100-finalSum;
            if(overallAverageTIR.target !== undefined) overallAverageTIR.target += remainder;
            else {
                let largestKey = Object.keys(overallAverageTIR).reduce((a, b) => overallAverageTIR[a] > overallAverageTIR[b] ? a : b);
                overallAverageTIR[largestKey] += remainder;
            }
        }


    }


    const tirColors = {
      veryLow: 'bg-red-700', low: 'bg-red-500', target: 'bg-green-500',
      high: 'bg-yellow-400', veryHigh: 'bg-yellow-600',
    };

    return {
      reportName: "Glucose Percentile Chart",
      generatedDate: new Date().toLocaleDateString(),
      dataStartDate: currentStartDate.toISOString().split('T')[0],
      dataEndDate: currentEndDate.toISOString().split('T')[0],
      percentiles: percentileData,
      summaryTable: summaryTable,
      overallAverageTIR: overallAverageTIR,
      tirColors: tirColors
    };
  };

  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const reportData = await fetchData(startDate || undefined, endDate || undefined);
  
  return {
    percentileChartReport: reportData
  };
};
