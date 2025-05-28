import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const fetchData = async () => {
    await new Promise(resolve => setTimeout(resolve, 50)); 

    const distributionDataPoints = [
      // ... (existing data points)
      { range: '50-60', count: 5, percent: 2.5 },
      { range: '60-70', count: 15, percent: 7.5 },
      { range: '70-80', count: 25, percent: 12.5 },
      { range: '80-90', count: 40, percent: 20 },
      { range: '90-100', count: 35, percent: 17.5 },
      { range: '100-110', count: 30, percent: 15 },
      { range: '110-120', count: 20, percent: 10 },
      { range: '120-130', count: 10, percent: 5 },
      { range: '130-140', count: 8, percent: 4 },
      { range: '140-150', count: 5, percent: 2.5 },
      { range: '>150', count: 7, percent: 3.5 },
    ];

    // Current summaryMetrics are fine, we'll map them in the Svelte component
    const summaryMetrics = {
      totalReadings: 200,
      percentVeryLow: 2.5, // Assuming 'Below' can be split further if needed, or grouped
      percentLow: 7.5,
      percentTarget: 62.5, // Example: 12.5+20+17.5+15 for 70-110 if that's target
      percentHigh: 16.5,   // Example: 10+5+4 for 110-140
      percentVeryHigh: 11, // Example: 2.5 + 3.5 for 140+
    };
    // Let's refine summaryMetrics to directly map to standard TIR categories for pie chart
    // These are example calculations based on the distributionDataPoints ranges
    // Very Low: <54 (no direct bin, assume 0 or combine from lowest if applicable)
    // Low: 54-69 (approximated by '50-60' and '60-70' bins)
    // Target: 70-180 (approximated by relevant bins)
    // High: 181-250 (approximated by relevant bins)
    // Very High: >250 (approximated by relevant bins)

    // For simplicity, we'll use slightly more direct TIR values for the pie chart
    // This would ideally be calculated from raw data in a real scenario
    const tirSpecificSummary = {
        veryLow: 5,
        low: 10,
        target: 70,
        high: 10,
        veryHigh: 5
    };
    // Normalize to 100%
    let totalTIR = Object.values(tirSpecificSummary).reduce((sum, val) => sum + val, 0);
    if (totalTIR > 0) {
        const sf = 100 / totalTIR;
        let runningTotal = 0;
        const keys = Object.keys(tirSpecificSummary);
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            tirSpecificSummary[key] = Math.round(tirSpecificSummary[key] * sf);
            runningTotal += tirSpecificSummary[key];
        }
        // Assign the remainder to the last category (target) to ensure sum is 100
        tirSpecificSummary[keys[keys.length-1]] = 100 - runningTotal;

        // Check sum again due to potential rounding of all but last, if target was not last, this could be an issue.
        // The provided code snippet implies target is adjusted, let's assume target is one of the keys,
        // and if it was the last one, it's fine. If not, this logic may not be perfect.
        // For this task, we'll stick to the provided normalization logic.
        let currentSum = Object.values(tirSpecificSummary).reduce((s,v)=>s+v,0);
        if (currentSum !== 100 && tirSpecificSummary.target) { // If target is not the last element, this logic is flawed.
             // The most robust way is to assign the remainder to the largest category, usually target.
             const diff = 100 - currentSum;
             tirSpecificSummary.target += diff; // Add difference to target
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
      reportName: "Glucose Distribution Report",
      generatedDate: new Date().toLocaleDateString(),
      distributionData: distributionDataPoints,
      summaryMetrics: summaryMetrics, // Keep original summary for cards
      tirForPieChart: tirSpecificSummary, // Add specific data for pie chart
      tirColors: tirColors
    };
  };

  const data = await fetchData();
  return {
    distributionReport: data
  };
};
