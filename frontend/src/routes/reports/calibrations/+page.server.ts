import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const fetchData = async () => {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay

    // Sample data for calibration events
    const calibrationEvents = Array.from({ length: 8 }, (_, i) => {
      const eventDate = new Date(2024, 6, 15 + i, 8 + i * 2, 30 + i * 5); // Varying dates and times
      const meterBg = 80 + Math.random() * 60;
      const sensorBg = meterBg - 10 + Math.random() * 20;
      return {
        id: `cal-${i}`,
        timestamp: eventDate.toISOString(),
        meterBg: Math.round(meterBg),
        sensorBgBefore: Math.round(sensorBg),
        sensorBgAfter: Math.round(sensorBg + (Math.random() * 6 - 3)), // Small change after calibration
        slope: (0.8 + Math.random() * 0.4).toFixed(3),
        intercept: (15 + Math.random() * 10).toFixed(2),
        scale: (0.9 + Math.random() * 0.2).toFixed(3), // Hypothetical scale factor
      };
    });

    return {
      reportName: "Calibrations Report",
      generatedDate: new Date().toLocaleDateString(),
      calibrations: calibrationEvents
    };
  };

  const data = await fetchData();
  return {
    calibrationsReport: data
  };
};
