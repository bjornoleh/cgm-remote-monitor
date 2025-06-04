/**
 * Utility functions for processing glucose percentile data
 */

export interface WeeklyPercentileData {
  date: Date;
  low: number;        // 10th percentile
  p25: number;        // 25th percentile  
  median: number;     // 50th percentile
  p75: number;        // 75th percentile
  high: number;       // 90th percentile
}

/**
 * Transform raw percentile data into weekly percentile format
 * @param rawData - Array of arrays containing [lower_bound, upper_bound] pairs for each percentile
 * @param dates - Array of dates corresponding to each data point
 * @returns Array of WeeklyPercentileData
 */
export function transformPercentileData(
  rawData: number[][][], 
  dates: Date[]
): WeeklyPercentileData[] {
  if (!rawData || rawData.length < 5 || !dates || dates.length === 0) {
    return [];
  }

  const [veryLowData, lowData, normalData, highData, veryHighData] = rawData;

  return dates.map((date, index) => {
    // Extract bounds for each percentile range
    const veryLow = veryLowData[index] || [0, 0];
    const low = lowData[index] || [0, 0]; 
    const normal = normalData[index] || [0, 0];
    const high = highData[index] || [0, 0];
    const veryHigh = veryHighData[index] || [0, 0];

    return {
      date,
      low: veryLow[1],        // 10th percentile (upper bound of very low)
      p25: low[1],            // 25th percentile (upper bound of low)
      median: (normal[0] + normal[1]) / 2,  // Median (middle of normal range)
      p75: high[0],           // 75th percentile (lower bound of high)
      high: high[1]           // 90th percentile (upper bound of high)
    };
  });
}

/**
 * Generate sample data for demonstration
 * @param days - Number of days to generate data for
 * @returns Array of WeeklyPercentileData
 */
export function generateSamplePercentileData(days: number = 7): WeeklyPercentileData[] {
  const data: WeeklyPercentileData[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Generate realistic glucose percentile values
    const base = 100 + Math.sin(i * 0.5) * 20; // Base glucose with some variation
    
    data.push({
      date,
      low: Math.max(40, base - 60 + Math.random() * 20),      // ~10th percentile
      p25: Math.max(60, base - 30 + Math.random() * 15),      // ~25th percentile
      median: base + Math.random() * 10 - 5,                  // ~50th percentile
      p75: base + 30 + Math.random() * 15,                    // ~75th percentile
      high: Math.min(350, base + 80 + Math.random() * 30)     // ~90th percentile
    });
  }

  return data;
}

/**
 * Calculate glucose statistics from percentile data
 * @param data - Array of WeeklyPercentileData
 * @returns Object containing various statistics
 */
export function calculateGlucoseStats(data: WeeklyPercentileData[]) {
  if (!data || data.length === 0) {
    return {
      averageMedian: 0,
      timeInRange: 0,
      timeBelow: 0,
      timeAbove: 0,
      averageVariability: 0
    };
  }

  const medians = data.map(d => d.median);
  const averageMedian = medians.reduce((sum, val) => sum + val, 0) / medians.length;

  // Estimate time in range based on percentile spread
  const timeInRangeValues = data.map(d => {
    const totalRange = d.high - d.low;
    const inRangeSpread = Math.max(0, Math.min(180, d.p75) - Math.max(70, d.p25));
    return totalRange > 0 ? (inRangeSpread / totalRange) * 100 : 0;
  });
  
  const timeInRange = timeInRangeValues.reduce((sum, val) => sum + val, 0) / timeInRangeValues.length;

  // Estimate time below/above range
  const timeBelowValues = data.map(d => d.p25 < 70 ? 25 : d.low < 70 ? 10 : 0);
  const timeBelow = timeBelowValues.reduce((sum, val) => sum + val, 0) / timeBelowValues.length;

  const timeAboveValues = data.map(d => d.p75 > 180 ? 25 : d.high > 180 ? 10 : 0);
  const timeAbove = timeAboveValues.reduce((sum, val) => sum + val, 0) / timeAboveValues.length;

  // Calculate average variability (IQR)
  const variabilityValues = data.map(d => d.p75 - d.p25);
  const averageVariability = variabilityValues.reduce((sum, val) => sum + val, 0) / variabilityValues.length;

  return {
    averageMedian: Math.round(averageMedian),
    timeInRange: Math.round(timeInRange),
    timeBelow: Math.round(timeBelow),
    timeAbove: Math.round(timeAbove),
    averageVariability: Math.round(averageVariability)
  };
}
