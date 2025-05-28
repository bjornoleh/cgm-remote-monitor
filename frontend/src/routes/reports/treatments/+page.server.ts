import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => { 
  const fetchData = async (startDateParam?: string, endDateParam?: string, activeTypesParam?: string) => {
    await new Promise(resolve => setTimeout(resolve, 50));

    let currentStartDate: Date;
    let currentEndDate: Date;

    if (startDateParam && endDateParam) {
      currentStartDate = new Date(startDateParam + 'T00:00:00Z'); 
      currentEndDate = new Date(endDateParam + 'T23:59:59Z');   
    } else {
      currentEndDate = new Date(); 
      currentStartDate = new Date();
      currentStartDate.setUTCDate(currentEndDate.getUTCDate() - 6); 
      currentStartDate.setUTCHours(0,0,0,0);
      currentEndDate.setUTCHours(23,59,59,999);
    }

    const allPossibleTreatmentEvents = [ 
      { id: 'treat-0', timestamp: new Date(Date.UTC(2024, 5, 17, 10, 0)).toISOString(), eventType: 'Carbs', details: 'Carbs: 20g', notes: 'Old Snack' }, // Month is 0-indexed, so 5 is June
      { id: 'treat-1', timestamp: new Date(Date.UTC(2024, 5, 18, 8, 0)).toISOString(), eventType: 'Bolus', details: 'Insulin: 5.0 U', notes: 'Breakfast correction' },
      { id: 'treat-2', timestamp: new Date(Date.UTC(2024, 5, 18, 8, 5)).toISOString(), eventType: 'Carbs', details: 'Carbs: 45g', notes: 'Breakfast' },
      { id: 'treat-3', timestamp: new Date(Date.UTC(2024, 5, 19, 10, 30)).toISOString(), eventType: 'Exercise', details: 'Duration: 30min', notes: 'Light walk' },
      { id: 'treat-4', timestamp: new Date(Date.UTC(2024, 5, 20, 12, 15)).toISOString(), eventType: 'Bolus', details: 'Insulin: 3.0 U', notes: 'Lunch pre-bolus' },
      { id: 'treat-5', timestamp: new Date(Date.UTC(2024, 5, 20, 12, 25)).toISOString(), eventType: 'Carbs', details: 'Carbs: 60g', notes: 'Lunch' },
      { id: 'treat-6', timestamp: new Date(Date.UTC(2024, 5, 21, 16, 0)).toISOString(), eventType: 'Correction Bolus', details: 'Insulin: 1.5 U', notes: 'Afternoon high' },
      { id: 'treat-7', timestamp: new Date(Date.UTC(2024, 5, 22, 18, 30)).toISOString(), eventType: 'Temp Basal', details: 'Rate: 150%, Duration: 2hr', notes: 'Pre-dinner activity' },
      { id: 'treat-8', timestamp: new Date(Date.UTC(2024, 5, 23, 9, 0)).toISOString(), eventType: 'Bolus', details: 'Insulin: 4.0 U', notes: 'Breakfast' },
      { id: 'treat-9', timestamp: new Date(Date.UTC(2024, 5, 24, 14, 0)).toISOString(), eventType: 'Carbs', details: 'Carbs: 30g', notes: 'Snack' },
      // More data spanning wider range
      { id: 'treat-10', timestamp: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), eventType: 'Bolus', details: 'Insulin: 2.0 U', notes: 'Yesterday correction' },
      { id: 'treat-11', timestamp: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), eventType: 'Carbs', details: 'Carbs: 50g', notes: 'Day before yesterday lunch' },
      { id: 'treat-12', timestamp: new Date(new Date().getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(), eventType: 'Bolus', details: 'Insulin: 6.0 U', notes: '8 days ago bolus' },
      { id: 'treat-13', timestamp: new Date(new Date().getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), eventType: 'Exercise', details: 'Duration: 60min', notes: '10 days ago run' },

    ];

    const activeEventTypes = activeTypesParam ? activeTypesParam.split(',') : [];

    let filteredTreatmentEvents = allPossibleTreatmentEvents.filter(event => {
      const eventDate = new Date(event.timestamp); // event.timestamp is already ISO UTC string
      const dateMatch = eventDate >= currentStartDate && eventDate <= currentEndDate;
      if (!dateMatch) return false;
      if (activeEventTypes.length > 0 && !activeEventTypes.includes(event.eventType)) {
        return false;
      }
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Most recent first for table

    let iobPoints: { x: Date, y: number }[] = [];
    const relevantBoluses = filteredTreatmentEvents // Use already filtered events
      .filter(t => t.eventType.includes('Bolus'))
      .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // Chronological for IOB calc

    if (relevantBoluses.length > 0) {
      let activeInsulin: { amount: number, decayStartTime: number, eventId: string }[] = []; // Added eventId for uniqueness
      const timeStepMinutes = 30;
      const insulinDurationHours = 4; 
      
      const iobChartStartTime = currentStartDate.getTime();
      const iobChartEndTime = new Date(currentEndDate.getTime() + insulinDurationHours * 3600000).getTime(); // Extend to show full decay

      for (let timeMs = iobChartStartTime; timeMs <= iobChartEndTime; timeMs += timeStepMinutes * 60000) {
        const currentTime = new Date(timeMs);
        let currentTickIOB = 0;
        
        // Add new boluses that occurred UP TO this point in time if not already added
        relevantBoluses.forEach(event => {
            const eventTime = new Date(event.timestamp).getTime();
            if (eventTime <= currentTime.getTime() && !activeInsulin.some(ins => ins.eventId === event.id)) {
                 const amount = parseFloat(event.details.match(/Insulin: ([\d.]+)/)?.[1] || '0');
                 if (amount > 0) {
                    activeInsulin.push({ amount, decayStartTime: eventTime, eventId: event.id });
                 }
            }
        });
        
        // Decay existing active insulin portions and sum up IOB
        activeInsulin = activeInsulin.filter(ins => {
            const hoursElapsed = (currentTime.getTime() - ins.decayStartTime) / (1000 * 60 * 60);
            const effectiveAmountRemaining = ins.amount * Math.max(0, (1 - (hoursElapsed / insulinDurationHours)));
            if (effectiveAmountRemaining > 0.01) {
                currentTickIOB += effectiveAmountRemaining;
                return true; // Keep this insulin portion
            }
            return false; // Insulin portion has decayed
        });
        
        // Add IOB point only if it's within the display window (currentStartDate to currentEndDate + duration)
        // The loop condition already ensures this, but points are for display on chart
        iobPoints.push({ x: currentTime, y: parseFloat(currentTickIOB.toFixed(2)) });
      }
    }
    
    // If no IOB points (e.g. no boluses in range), add points to show zero line for the selected range
    if (iobPoints.length === 0) {
        iobPoints.push({x: new Date(currentStartDate), y: 0}); // Start point for the zero line
        if (currentStartDate.getTime() !== currentEndDate.getTime()) { // Avoid duplicate if range is single instant
             iobPoints.push({x: new Date(currentEndDate), y: 0}); // End point for the zero line
        }
    }


    return {
      reportName: "Treatments Log",
      generatedDate: new Date().toLocaleDateString(),
      dataStartDate: currentStartDate.toISOString().split('T')[0],
      dataEndDate: currentEndDate.toISOString().split('T')[0],
      activeEventTypes: activeEventTypes,
      treatments: filteredTreatmentEvents,
      iobData: iobPoints 
    };
  };

  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const types = url.searchParams.get('types');

  const reportData = await fetchData(startDate || undefined, endDate || undefined, types || undefined);
  
  return {
    treatmentsReport: reportData
  };
};
