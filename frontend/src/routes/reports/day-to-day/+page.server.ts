import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const fetchData = async () => {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
    const startDate = new Date('2024-07-01T00:00:00Z');
    const dataPoints = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      return {
        date: date.toISOString().split('T')[0], // YYYY-MM-DD
        value: 110 + Math.round(Math.random() * 20) - 10, // Simulate glucose values around 110
        trend: Math.random() > 0.5 ? (Math.random() > 0.5 ? "rising" : "falling") : "stable"
      };
    });

    return {
      reportName: "Day to day Glucose Report",
      generatedDate: new Date().toLocaleDateString(),
      dailyData: dataPoints
    };
  };

  const data = await fetchData();
  return {
    dayTodayReport: data // Ensure this key is used
  };
};
