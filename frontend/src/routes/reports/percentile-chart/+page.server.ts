import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const fetchData = async () => {
    await new Promise(resolve => setTimeout(resolve, 50)); 

    const timePoints = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

    const generatePercentileSeries = (baseValue: number, variability: number) => {
      return timePoints.map((time, index) => ({
        x: time,
        y: Math.round(baseValue + (Math.random() - 0.5) * variability + Math.sin(index / 3) * (variability / 4))
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

    // Simulate overall average TIR based on median glucose
    let overallAverageTIR = { veryLow: 5, low: 10, target: 70, high: 10, veryHigh: 5 }; // Default values
    const medianSeries = percentileData['50th (Median)'];
    if (medianSeries) {
      const averageMedianGlucose = medianSeries.reduce((sum, p) => sum + p.y, 0) / medianSeries.length;
      // Simplified logic: adjust TIR based on how average median deviates from a target (e.g., 100-110)
      if (averageMedianGlucose < 90) { // Higher proportion of lows
        overallAverageTIR = { veryLow: 8, low: 15, target: 60, high: 12, veryHigh: 5 };
      } else if (averageMedianGlucose > 130) { // Higher proportion of highs
        overallAverageTIR = { veryLow: 3, low: 7, target: 60, high: 15, veryHigh: 15 };
      }
    }
    // Normalize overallAverageTIR
    let totalOverallTIR = Object.values(overallAverageTIR).reduce((s, v) => s + v, 0);
    if (totalOverallTIR > 0) {
      const scale = 100 / totalOverallTIR;
      Object.keys(overallAverageTIR).forEach(key => {
        overallAverageTIR[key] = Math.round(overallAverageTIR[key] * scale);
      });
      let currentSum = Object.values(overallAverageTIR).reduce((s,v)=>s+v,0);
      if (currentSum !== 100 && overallAverageTIR.target) { // Check if target exists before adjusting
        overallAverageTIR.target += (100 - currentSum);
      } else if (currentSum !== 100) { // Fallback if target is not defined or doesn't resolve sum
          // If target is not available or sum is still off, adjust the largest category
          let largestKey = null;
          let maxVal = -1;
          for (const key in overallAverageTIR) {
              if (overallAverageTIR[key] > maxVal) {
                  maxVal = overallAverageTIR[key];
                  largestKey = key;
              }
          }
          if (largestKey) {
              overallAverageTIR[largestKey] += (100 - currentSum);
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
      reportName: "Glucose Percentile Chart",
      generatedDate: new Date().toLocaleDateString(),
      percentiles: percentileData,
      summaryTable: summaryTable,
      overallAverageTIR: overallAverageTIR, // Add this
      tirColors: tirColors                // Add this
    };
  };

  const data = await fetchData();
  return {
    percentileChartReport: data
  };
};
