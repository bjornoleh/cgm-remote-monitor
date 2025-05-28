import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => { // Added `url`
  const fetchData = async (startDateParam?: string, endDateParam?: string) => {
    await new Promise(resolve => setTimeout(resolve, 50)); 

    let currentStartDate: Date;
    let currentEndDate: Date;

    if (startDateParam && endDateParam) {
      currentStartDate = new Date(startDateParam + 'T00:00:00Z'); // Ensure time is start of day UTC
      currentEndDate = new Date(endDateParam + 'T23:59:59Z');   // Ensure time is end of day UTC
    } else {
      // Default to last 7 days
      currentEndDate = new Date();
      currentStartDate = new Date();
      currentStartDate.setDate(currentEndDate.getDate() - 6); // 7 days including today
      currentStartDate.setUTCHours(0,0,0,0); // Start of the day
      currentEndDate.setUTCHours(23,59,59,999); // End of the day
    }
    
    const dateArray = [];
    let iterDate = new Date(currentStartDate);
    // Ensure iterDate is also interpreted as UTC for comparison with currentEndDate (which is UTC based on how it's set)
    // For loop condition, make sure we are comparing apples to apples (both dates as UTC midnight or specific times)
    // Since currentEndDate is set to end of day UTC, direct comparison should be fine.
    while(iterDate <= currentEndDate) {
        dateArray.push(new Date(iterDate)); // iterDate is already UTC start of day
        iterDate.setUTCDate(iterDate.getUTCDate() + 1); // Increment UTC date
    }

    const dataPoints = dateArray.map(date => {
      return {
        date: date.toISOString().split('T')[0], 
        value: 110 + Math.round(Math.random() * 20) - 10,
        trend: Math.random() > 0.5 ? (Math.random() > 0.5 ? "rising" : "falling") : "stable"
      };
    });

    return {
      reportName: "Day to day Glucose Report",
      generatedDate: new Date().toLocaleDateString(),
      dailyData: dataPoints,
      // Return the dates used for this data set
      dataStartDate: currentStartDate.toISOString().split('T')[0],
      dataEndDate: currentEndDate.toISOString().split('T')[0]
    };
  };

  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  const reportData = await fetchData(startDate || undefined, endDate || undefined);
  
  return {
    dayTodayReport: reportData
  };
};
