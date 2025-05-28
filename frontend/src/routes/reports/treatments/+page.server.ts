import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const fetchData = async () => {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay

    // Sample data for treatment events
    const treatmentEvents = [
      { id: 'treat-1', timestamp: new Date(2024, 6, 20, 8, 0).toISOString(), eventType: 'Bolus', details: 'Insulin: 5.0 U', notes: 'Breakfast correction' },
      { id: 'treat-2', timestamp: new Date(2024, 6, 20, 8, 5).toISOString(), eventType: 'Carbs', details: 'Carbs: 45g', notes: 'Breakfast' },
      { id: 'treat-3', timestamp: new Date(2024, 6, 20, 10, 30).toISOString(), eventType: 'Exercise', details: 'Duration: 30min', notes: 'Light walk' },
      { id: 'treat-4', timestamp: new Date(2024, 6, 20, 12, 15).toISOString(), eventType: 'Bolus', details: 'Insulin: 3.0 U', notes: 'Lunch pre-bolus' },
      { id: 'treat-5', timestamp: new Date(2024, 6, 20, 12, 25).toISOString(), eventType: 'Carbs', details: 'Carbs: 60g', notes: 'Lunch' },
      { id: 'treat-6', timestamp: new Date(2024, 6, 20, 16, 0).toISOString(), eventType: 'Correction Bolus', details: 'Insulin: 1.5 U', notes: 'Afternoon high' },
      { id: 'treat-7', timestamp: new Date(2024, 6, 20, 18, 30).toISOString(), eventType: 'Temp Basal', details: 'Rate: 150%, Duration: 2hr', notes: 'Pre-dinner activity' },
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort by most recent first

    // Simulate IOB (Insulin On Board) data points based on boluses for a chart
    // This is highly simplified. Real IOB calculation is complex.
    let iobPoints = [];
    let currentIOB = 0;
    const iobDecayRate = 0.25; // Units per hour (example: 4-hour linear decay for a unit)
    const timeStepMinutes = 30;
    
    // Create a timeline of all relevant events (boluses and a final decay point)
    const eventTimes = new Set<number>();
    treatmentEvents.filter(t => t.eventType.includes('Bolus')).forEach(bolus => {
        eventTimes.add(new Date(bolus.timestamp).getTime());
    });
    // Add points for a few hours after the last bolus to show decay
    if (treatmentEvents.length > 0) {
        const lastEventTime = new Date(treatmentEvents[0].timestamp).getTime(); // sorted recent first
        const lastBolus = treatmentEvents.find(t => t.eventType.includes('Bolus'));
        if (lastBolus) {
             const lastBolusTime = new Date(lastBolus.timestamp).getTime();
             for (let i = 1; i <= 8; i++) { // up to 4 hours later
                eventTimes.add(lastBolusTime + i * timeStepMinutes * 60000);
             }
        } else { // No boluses, add some points around first event to show 0 IOB
            const firstEventTime = new Date(treatmentEvents[treatmentEvents.length-1].timestamp).getTime();
             for (let i = -2; i <= 2; i++) { 
                eventTimes.add(firstEventTime + i * timeStepMinutes * 60000);
             }
        }
    }


    const sortedTimes = Array.from(eventTimes).sort((a,b) => a - b);
    
    let activeInsulin = []; // { amount: number, decayStartTime: number }

    for (const timeMs of sortedTimes) {
        const currentTime = new Date(timeMs);
        
        // Decay existing active insulin
        currentIOB = 0;
        activeInsulin = activeInsulin.filter(ins => {
            const hoursElapsed = (currentTime.getTime() - ins.decayStartTime) / (1000 * 60 * 60);
            const remaining = ins.amount - (hoursElapsed * iobDecayRate * (ins.amount / (ins.amount || 1))); // Decay proportional to initial amount
            // This decay logic is still very basic. A true model uses duration curves.
            // Simplified: assume insulin decays over ~4 hours (so decayRate of 0.25/hr means 1U gone in 4hr)
            const initialAmount = ins.amount; // if 1U lasts 4 hours, decay rate is 0.25 U/hr
            const insulinDurationHours = 4; // Standard assumption
            const decayPerStep = initialAmount / (insulinDurationHours / (timeStepMinutes/60)); // how much decays per step if spread over duration

            // More common: linear decay based on fixed duration
            const effectiveAmountRemaining = initialAmount * (1 - (hoursElapsed / insulinDurationHours));

            if (effectiveAmountRemaining > 0.01) { // Keep if more than minimal amount
                 currentIOB += effectiveAmountRemaining;
                 return true;
            }
            return false;
        });

        // Add new boluses at this time
        treatmentEvents.forEach(event => {
            if (new Date(event.timestamp).getTime() === currentTime.getTime() && event.eventType.includes('Bolus')) {
                const amount = parseFloat(event.details.match(/Insulin: ([\d.]+)/)?.[1] || '0');
                if (amount > 0) {
                    activeInsulin.push({ amount, decayStartTime: currentTime.getTime() });
                    currentIOB += amount;
                }
            }
        });
        iobPoints.push({ x: currentTime, y: parseFloat(currentIOB.toFixed(2)) });
    }
    // Ensure IOB eventually goes to 0 if no more boluses
     if (iobPoints.length > 0) {
        let lastPoint = iobPoints[iobPoints.length - 1];
        let safetyCounter = 0;
        while(lastPoint.y > 0 && safetyCounter < 24) { // Max 12 more hours of decay
            const nextTime = new Date(lastPoint.x.getTime() + timeStepMinutes * 60000);
            let decayingIOB = 0;
            activeInsulin = activeInsulin.filter(ins => {
                 const hoursElapsed = (nextTime.getTime() - ins.decayStartTime) / (1000 * 60 * 60);
                 const insulinDurationHours = 4;
                 const effectiveAmountRemaining = ins.amount * (1 - (hoursElapsed / insulinDurationHours));
                 if (effectiveAmountRemaining > 0.01) {
                     decayingIOB += effectiveAmountRemaining;
                     return true;
                 }
                 return false;
            });
            lastPoint = {x: nextTime, y: parseFloat(decayingIOB.toFixed(2))};
            iobPoints.push(lastPoint);
            safetyCounter++;
        }
    }


    return {
      reportName: "Treatments Log",
      generatedDate: new Date().toLocaleDateString(),
      treatments: treatmentEvents,
      iobData: iobPoints.filter((p,i,arr) => i === 0 || p.y !== arr[i-1].y || p.x.getTime() !== arr[i-1].x.getTime() || (p.y === 0 && arr[i-1].y !==0) ) // Filter out redundant points for cleaner chart
                       .sort((a,b) => a.x.getTime() - b.x.getTime())
    };
  };

  const data = await fetchData();
  return {
    treatmentsReport: data
  };
};
