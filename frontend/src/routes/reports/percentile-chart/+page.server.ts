import type { PageServerLoad } from './$types';
import { apiGet } from '$lib/api';

interface GlucoseEntry {
  _id: string;
  sgv: number;
  date: number;
  dateString: string;
  type: string;
  direction?: string;
}

interface PercentileDataPoint {
  hour: string; // Changed from x
  value: number; // Changed from y
}

export const load: PageServerLoad = async ({ fetch, url }) => {  const fetchData = async () => {
    // Get date range parameters from URL or use defaults
    const searchParams = url.searchParams;
    const daysBack = parseInt(searchParams.get('days') || '30');
    const useMockData = searchParams.get('mock') === 'true';
    const now = new Date();
    const endDate = new Date(now.getTime());
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // If mock data is requested, return it immediately
    if (useMockData) {
      console.log('Using mock data as requested via URL parameter');
      return generateMockData();
    }// Fetch glucose entries from Nightscout API
    // Use date range in milliseconds for better compatibility
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    const entriesResponse = await apiGet<GlucoseEntry[]>(fetch, '/api/v1/entries.json', {
      params: {
        'find[date][$gte]': startTime.toString(),
        'find[date][$lte]': endTime.toString(),
        'find[type]': 'sgv',
        'count': '10000' // Get a large number to ensure we have all data
      },
      throwOnError: false
    });    if (!entriesResponse.success || !entriesResponse.data) {
      console.error('Failed to fetch glucose entries:', entriesResponse.error);
      console.log('Falling back to mock data');
      // Fallback to mock data if API fails
      return generateMockData();
    }

    const entries = entriesResponse.data;
    console.log(`Fetched ${entries.length} glucose entries for percentile calculation`);
    
    if (entries.length === 0) {
      console.warn('No glucose entries found for the specified period');
      return generateMockData();
    }

    // Process entries to calculate percentiles by hour
    const percentiles = calculateHourlyPercentiles(entries);    const summaryTable = calculateSummaryTable(percentiles);
    const overallAverageTIR = calculateTimeInRange(entries); // Using valid entries

    // TIR colors for the pie chart
    const tirColors = {
      veryLow: 'bg-red-700',
      low: 'bg-red-500',
      target: 'bg-green-500',
      high: 'bg-yellow-400',
      veryHigh: 'bg-yellow-600',
    };

    // Transform percentiles for AreaChart
    const percentileKeysMap: Record<string, string> = {
      "10th": "p10",
      "25th": "p25",
      "50th (Median)": "median",
      "75th": "p75",
      "90th": "p90",
    };
    
    const areaChartData: Array<Record<string, string | number | null>> = [];
    if (Object.keys(percentiles).length > 0) {
      const hours = Array.from({ length: 24 }, (_, idx) => idx.toString().padStart(2, '0'));
      hours.forEach(h => {
        const hourData: Record<string, string | number | null> = { hour: h };
        let dataFoundForHour = false;
        Object.entries(percentileKeysMap).forEach(([originalKey, newKey]) => {
          const series = percentiles[originalKey];
          const point = series?.find(p => p.hour === h);
          if (point) {
            hourData[newKey] = point.value;
            dataFoundForHour = true;
          } else {
            // If interpolation ensures data, this 'else' might not be hit often for valid series
            hourData[newKey] = null; 
          }
        });        // Only add hour data if at least one percentile value was found (or interpolated)
        // This check might be redundant if interpolation always fills data
        if (dataFoundForHour) { 
            areaChartData.push(hourData);
        }
      });
    }

    const reportData = {
      reportName: "Glucose Percentile Chart",
      generatedDate: new Date().toLocaleDateString(),
      percentiles, // Keep original percentiles for summary table or other uses if needed
      areaChartData, // Add new structure for the area chart
      summaryTable,
      overallAverageTIR,
      tirColors,
      dateRange: {
        start: startDate.toLocaleDateString(),
        end: endDate.toLocaleDateString(),
        days: daysBack
      }
    };
    return reportData;
  };

  const data = await fetchData();
  return {
    percentileChartReport: data
  };
};

// Helper function to calculate percentiles for each hour of the day
function calculateHourlyPercentiles(entries: GlucoseEntry[]): Record<string, PercentileDataPoint[]> {
  const groupedByHour: Record<string, number[]> = {};
  for (let i = 0; i < 24; i++) {
    groupedByHour[i.toString().padStart(2, '0')] = [];
  }

  entries.forEach(entry => {
    // Ensure sgv is within a reasonable range for CGM data
    if (entry.sgv >= 39 && entry.sgv <= 600) {
      const hour = new Date(entry.date).getHours().toString().padStart(2, '0');
      if (groupedByHour[hour]) {
        groupedByHour[hour].push(entry.sgv);
      }
    }
  });

  const percentilesData: Record<string, PercentileDataPoint[]> = {
    "10th": [],
    "25th": [],
    "50th (Median)": [],
    "75th": [],
    "90th": [],
  };

  const percentileValues = [0.10, 0.25, 0.50, 0.75, 0.90];
  const percentileNames = ["10th", "25th", "50th (Median)", "75th", "90th"];

  // Calculate initial percentiles
  for (let i = 0; i < 24; i++) {
    const hourStr = i.toString().padStart(2, '0');
    const hourValues = groupedByHour[hourStr]?.sort((a, b) => a - b);

    percentileNames.forEach((name, index) => {
      if (hourValues && hourValues.length > 0) {
        percentilesData[name].push({
          hour: hourStr, // Changed from x
          value: calculatePercentile(hourValues, percentileValues[index]), // Changed from y
        });
      }
    });
  }

  // Interpolate missing hours for each percentile series
  percentileNames.forEach(name => {
    const series = percentilesData[name];
    if (series.length === 0 || series.length === 24) return; // No data or full data, no interpolation needed

    const completeSeries: PercentileDataPoint[] = [];
    const existingHours = new Map(series.map(p => [p.hour, p.value]));

    for (let i = 0; i < 24; i++) {
      const hourStr = i.toString().padStart(2, '0');
      if (existingHours.has(hourStr)) {
        completeSeries.push({ hour: hourStr, value: existingHours.get(hourStr)! });
      } else {
        // Find previous and next available data points for interpolation
        let prevPoint: PercentileDataPoint | undefined;
        for (let j = i - 1; j >= 0; j--) {
          const prevHourStr = j.toString().padStart(2, '0');
          if (existingHours.has(prevHourStr)) {
            prevPoint = { hour: prevHourStr, value: existingHours.get(prevHourStr)! };
            break;
          }
        }

        let nextPoint: PercentileDataPoint | undefined;
        for (let j = i + 1; j < 24; j++) {
          const nextHourStr = j.toString().padStart(2, '0');
          if (existingHours.has(nextHourStr)) {
            nextPoint = { hour: nextHourStr, value: existingHours.get(nextHourStr)! };
            break;
          }
        }
        
        let interpolatedValue: number;
        if (prevPoint && nextPoint) {
          const prevHour = parseInt(prevPoint.hour);
          const nextHour = parseInt(nextPoint.hour);
          const currentHour = i;
          // Linear interpolation
          interpolatedValue = prevPoint.value + (nextPoint.value - prevPoint.value) * (currentHour - prevHour) / (nextHour - prevHour);
        } else if (prevPoint) {
          interpolatedValue = prevPoint.value; // Use previous if next is not available
        } else if (nextPoint) {
          interpolatedValue = nextPoint.value; // Use next if previous is not available
        } else {
          // This case should ideally not happen if there's any data in the series
          // Fallback to a default or skip, here we'll use 0 or some indicator
          interpolatedValue = 0; // Or handle as per requirements
        }
        completeSeries.push({ hour: hourStr, value: Math.round(interpolatedValue) });
      }
    }
    percentilesData[name] = completeSeries;
  });
  
  return percentilesData;
}

// Helper function to calculate a specific percentile
function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  
  const index = percentile * (sortedArray.length - 1);
  
  if (Math.floor(index) === index) {
    return sortedArray[index];
  } else {
    const lower = sortedArray[Math.floor(index)];
    const upper = sortedArray[Math.ceil(index)];
    return lower + (upper - lower) * (index - Math.floor(index));
  }
}

// Helper function to calculate Time in Range
function calculateTimeInRange(entries: GlucoseEntry[]) {
  if (entries.length === 0) {
    return { veryLow: 0, low: 0, target: 0, high: 0, veryHigh: 0 };
  }

  // Standard glucose ranges (mg/dL)
  const ranges = {
    veryLow: 54,   // Below 54
    low: 70,       // 54-69
    target: 180,   // 70-179 (target range)
    high: 250,     // 180-249
    veryHigh: 250  // 250+
  };
  const counts = {
    veryLow: 0,
    low: 0,
    target: 0,
    high: 0,
    veryHigh: 0
  };
  entries.forEach(entry => {
    if (entry.sgv && entry.sgv > 39 && entry.sgv < 600) { // Filter out invalid readings
      if (entry.sgv < ranges.veryLow) {
        counts.veryLow++;
      } else if (entry.sgv < ranges.low) {
        counts.low++;
      } else if (entry.sgv < ranges.target) {
        counts.target++;
      } else if (entry.sgv < ranges.high) {
        counts.high++;
      } else {
        counts.veryHigh++;
      }
    }
  });

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  
  if (total === 0) {
    return { veryLow: 0, low: 0, target: 0, high: 0, veryHigh: 0 };
  }

  // Convert to percentages
  return {
    veryLow: Math.round((counts.veryLow / total) * 100),
    low: Math.round((counts.low / total) * 100),
    target: Math.round((counts.target / total) * 100),
    high: Math.round((counts.high / total) * 100),
    veryHigh: Math.round((counts.veryHigh / total) * 100)
  };
}

// Helper function to calculate summary table from percentiles
function calculateSummaryTable(percentiles: Record<string, PercentileDataPoint[]>) {
  return Object.entries(percentiles).map(([name, points]) => {
    const values = points.map(p => p.value); // Changed from p.y
    return {
      percentile: name,
      min: values.length > 0 ? Math.min(...values).toFixed(0) : "N/A",
      avg: values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(0) : "N/A",
      max: values.length > 0 ? Math.max(...values).toFixed(0) : "N/A",
    };
  });
}

// Fallback function for mock data when API fails
function generateMockData() {
  const timePoints = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const generatePercentileSeries = (baseValue: number, variability: number) => {
    return timePoints.map((time, index) => ({
      hour: time,
      value: Math.round(baseValue + (Math.random() - 0.5) * variability + Math.sin(index / 3) * (variability / 4))
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
      const values = percentileData[key].map(p => p.value);
      return {
          percentile: key,
          min: Math.min(...values),
          avg: parseFloat((values.reduce((a,b) => a+b,0)/values.length).toFixed(1)),
          max: Math.max(...values)
      };
  });

  // Transform percentiles for AreaChart (mock data)
  const areaChartData = timePoints.map((time, index) => {
    const hour = index.toString().padStart(2, '0');
    return {
      hour,
      p10: percentileData['10th'][index].value,
      p25: percentileData['25th'][index].value,
      median: percentileData['50th (Median)'][index].value,
      p75: percentileData['75th'][index].value,
      p90: percentileData['90th'][index].value,
    };
  });

  // Mock TIR data
  const overallAverageTIR = { veryLow: 5, low: 10, target: 70, high: 10, veryHigh: 5 };

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
    areaChartData, // Add new structure for the area chart
    summaryTable: summaryTable,
    overallAverageTIR: overallAverageTIR,
    tirColors: tirColors,
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      end: new Date().toLocaleDateString(),
      days: 30
    }
  };
}
