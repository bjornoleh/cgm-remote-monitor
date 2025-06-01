// Demo data generator for development without live server connection
import type { Entry, Treatment, DeviceStatus, ServerSettings } from '../stores/client-state.svelte.ts';

// Add array.random() method for convenience
declare global {
  interface Array<T> {
    random(): T;
  }
}

Array.prototype.random = function() {
  return this[Math.floor(Math.random() * this.length)];
};

// Generate realistic blood glucose readings using drunkard's walk for predictability
function generateSGVEntries(count: number = 288): Entry[] {
  const entries: Entry[] = [];
  const now = Date.now();
  const interval = 5 * 60 * 1000; // 5 minutes

  // Base pattern: slightly higher in morning, lower at night
  const getBaseBG = (hour: number) => {
    if (hour >= 6 && hour <= 8) return 140; // Dawn phenomenon
    if (hour >= 12 && hour <= 14) return 120; // Lunch
    if (hour >= 18 && hour <= 20) return 110; // Dinner
    if (hour >= 22 || hour <= 5) return 90; // Night
    return 100; // Default
  };

  // Start with an initial blood glucose value
  let currentSGV = 110;

  for (let i = 0; i < count; i++) {
    const mills = now - (i * interval);
    const date = new Date(mills);
    const hour = date.getHours();

    // Drunkard's walk: small random steps from previous value
    const stepSize = (Math.random() - 0.5) * 12; // ±6 mg/dL per step

    // Gentle drift toward the base BG for the time of day
    const baseBG = getBaseBG(hour);
    const driftToBase = (baseBG - currentSGV) * 0.05; // 5% drift toward target

    // Add some periodic trends (meals, exercise, etc.)
    const periodicTrend = Math.sin(i * 0.08) * 3; // Gentle oscillation
      // Calculate new SGV using drunkard's walk
    currentSGV += stepSize + driftToBase + periodicTrend;

    // Keep in reasonable physiological range
    currentSGV = Math.max(40, Math.min(400, currentSGV));
    const sgv = Math.round(currentSGV);

    // Calculate direction based on previous reading
    let direction = 'Flat';
    if (i > 0) {
      const prevSGV = entries[0].sgv || entries[0].mgdl || 100;
      const change = sgv - prevSGV;
      if (change > 8) direction = 'DoubleUp';
      else if (change > 5) direction = 'SingleUp';
      else if (change > 2) direction = 'FortyFiveUp';
      else if (change < -8) direction = 'DoubleDown';
      else if (change < -5) direction = 'SingleDown';
      else if (change < -2) direction = 'FortyFiveDown';
    }const entry: Entry = {
      _id: `demo_sgv_${mills}`,
      type: 'sgv',
      sgv,
      direction,
      date: mills,
      mills,
      dateString: date.toISOString(),
      device: 'DemoG6',
      mgdl: sgv,
      delta: i > 0 ? sgv - (entries[0].sgv || 100) : 0,
      filtered: sgv + (Math.random() - 0.5) * 2,
      unfiltered: sgv + (Math.random() - 0.5) * 4,
      rssi: Math.floor(Math.random() * 100) + 150,
      noise: Math.floor(Math.random() * 3) + 1
    };

    entries.unshift(entry); // Add to beginning for chronological order
  }

  return entries;
}

// Generate various types of treatments
function generateTreatments(count: number = 50): Treatment[] {
  const treatments: Treatment[] = [];
  const now = Date.now();

  // Required treatments that must be included
  const requiredTreatments = [
    // Three meals
    { type: 'Meal Bolus', timing: 8 * 60 * 60 * 1000, meal: 'Breakfast' }, // 8 hours ago
    { type: 'Meal Bolus', timing: 4 * 60 * 60 * 1000, meal: 'Lunch' },     // 4 hours ago
    { type: 'Meal Bolus', timing: 1 * 60 * 60 * 1000, meal: 'Dinner' },    // 1 hour ago
    // One combo bolus
    { type: 'Combo Bolus', timing: 6 * 60 * 60 * 1000 },                   // 6 hours ago
    // Device maintenance
    { type: 'Site Change', timing: 2 * 24 * 60 * 60 * 1000 },              // 2 days ago
    { type: 'Sensor Start', timing: 3 * 24 * 60 * 60 * 1000 },             // 3 days ago
    { type: 'Insulin Change', timing: 1 * 24 * 60 * 60 * 1000 },           // 1 day ago
    // BG check and profile switch
    { type: 'BG Check', timing: 30 * 60 * 1000 },                          // 30 minutes ago
    { type: 'Profile Switch', timing: 12 * 60 * 60 * 1000 },               // 12 hours ago
    // Three temp basals
    { type: 'Temp Basal', timing: 3 * 60 * 60 * 1000 },                    // 3 hours ago
    { type: 'Temp Basal', timing: 5 * 60 * 60 * 1000 },                    // 5 hours ago
    { type: 'Temp Basal', timing: 7 * 60 * 60 * 1000 }                     // 7 hours ago
  ];

  // Optional treatments with 50% chance
  const optionalTreatments = [
    'Correction Bolus',
    'Carb Correction',
    'Snack Bolus',
    'Pump Battery Change',
    'Exercise',
    'Note',
    'Announcement'
  ];

  // Add required treatments
  requiredTreatments.forEach((req, index) => {
    const mills = now - req.timing;
    const date = new Date(mills);
    const treatment: Treatment = {
      _id: `demo_treatment_${mills}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: req.type,
      created_at: date.toISOString(),
      timestamp: date.toISOString(),
      enteredBy: ['Dad', 'Mom', 'Kiddo', 'Auto'][Math.floor(Math.random() * 4)],
      mills
    };    // Add type-specific properties
    switch (req.type) {
      case 'Meal Bolus': {
        const mealCarbs = req.meal === 'Breakfast' ? 45 : req.meal === 'Lunch' ? 65 : 80;
        treatment.carbs = mealCarbs + Math.floor(Math.random() * 20) - 10;
        treatment.insulin = Math.round((treatment.carbs * (0.08 + Math.random() * 0.04)) * 100) / 100;
        treatment.notes = req.meal === 'Breakfast' ? 'Oatmeal and fruit' :
                         req.meal === 'Lunch' ? 'Sandwich and chips' : 'Pasta with salad';
        break;
      }

      case 'Combo Bolus': {
        treatment.carbs = Math.floor(Math.random() * 40) + 30;
        treatment.insulin = Math.round((treatment.carbs * 0.1) * 100) / 100;
        treatment.duration = [90, 120, 180][Math.floor(Math.random() * 3)];
        treatment.notes = 'Pizza - extended bolus';
        break;
      }

      case 'Site Change': {
        treatment.notes = 'Changed pump site - upper arm';
        break;
      }

      case 'Sensor Start': {
        treatment.notes = 'Started new Dexcom G6 sensor';
        break;
      }

      case 'Insulin Change': {
        treatment.notes = 'Changed insulin cartridge - Humalog';
        break;
      }

      case 'Temp Basal': {
        treatment.percent = [75, 120, 150][index % 3]; // Vary the temp basal rates
        treatment.duration = [60, 90, 120][Math.floor(Math.random() * 3)];
        treatment.notes = treatment.percent < 100 ? 'Exercise temp basal' :
                         treatment.percent === 120 ? 'High BG correction' : 'Stress/illness';
        break;
      }

      case 'BG Check': {
        treatment.glucose = Math.floor(Math.random() * 80) + 90; // 90-170 range
        treatment.glucoseType = 'Finger';
        treatment.notes = 'Pre-meal check';
        break;
      }

      case 'Profile Switch': {
        treatment.notes = 'Switched to Exercise profile';
        treatment.profile = 'Exercise';
        treatment.duration = 120;
        break;
      }

      default: {
        treatment.notes = 'Demo treatment';
      }
    }

    treatments.push(treatment);
  });

  // Add optional treatments (50% chance each)
  const remainingSlots = Math.max(0, count - requiredTreatments.length);
  for (let i = 0; i < remainingSlots; i++) {
    // 50% chance to add an optional treatment
    if (Math.random() < 0.5) {
      const eventType = optionalTreatments[Math.floor(Math.random() * optionalTreatments.length)];
      const mills = now - (Math.random() * 7 * 24 * 60 * 60 * 1000); // Random within last week
      const date = new Date(mills);

      const treatment: Treatment = {
        _id: `demo_treatment_${mills}_${Math.random().toString(36).substr(2, 9)}`,
        eventType,
        created_at: date.toISOString(),
        timestamp: date.toISOString(),
        enteredBy: ['Dad', 'Mom', 'Kiddo', 'Auto'][Math.floor(Math.random() * 4)],
        mills
      };      // Add type-specific properties for optional treatments
      switch (eventType) {
        case 'Snack Bolus': {
          treatment.carbs = Math.floor(Math.random() * 25) + 10;
          treatment.insulin = Math.round((treatment.carbs * (0.08 + Math.random() * 0.04)) * 100) / 100;
          treatment.notes = ['Apple', 'Crackers', 'Yogurt', 'Granola bar'][Math.floor(Math.random() * 4)];
          break;
        }

        case 'Correction Bolus': {
          treatment.insulin = Math.round((Math.random() * 2 + 0.5) * 100) / 100;
          treatment.glucose = Math.floor(Math.random() * 100) + 180;
          treatment.glucoseType = 'Finger';
          treatment.notes = 'High BG correction';
          break;
        }

        case 'Carb Correction': {
          treatment.carbs = Math.floor(Math.random() * 20) + 10;
          treatment.notes = 'Low BG treatment';
          break;
        }

        case 'Exercise': {
          treatment.duration = Math.floor(Math.random() * 60) + 30;
          treatment.notes = ['Running', 'Walking', 'Swimming', 'Cycling', 'Gym'][Math.floor(Math.random() * 5)];
          break;
        }

        case 'Pump Battery Change': {
          treatment.notes = 'Changed pump battery';
          break;
        }

        case 'Note': {
          treatment.notes = ['Feeling sick', 'Stressful day', 'Good sleep', 'Travel day'][Math.floor(Math.random() * 4)];
          break;
        }

        case 'Announcement': {
          treatment.notes = 'System maintenance scheduled';
          break;
        }

        default: {
          treatment.notes = 'Demo treatment';
        }
      }

      treatments.push(treatment);
    }
  }

  return treatments.sort((a, b) => (b.mills || 0) - (a.mills || 0));
}

// Generate device status entries
function generateDeviceStatus(count: number = 20): DeviceStatus[] {
  const statuses: DeviceStatus[] = [];
  const now = Date.now();
  const interval = 5 * 60 * 1000; // 5 minutes

  for (let i = 0; i < count; i++) {
    const mills = now - (i * interval);
    const date = new Date(mills);
      const status: DeviceStatus = {
      _id: `demo_devicestatus_${mills}`,
      device: 'Demo Device',
      mills,
      created_at: date.toISOString(),
      uploader: {
        battery: Math.floor(Math.random() * 100),
        name: 'NightscoutUploader',
        type: 'iPhone'
      },
      pump: {
        battery: {
          percent: Math.floor(Math.random() * 100),
          voltage: Math.round((1.2 + Math.random() * 0.3) * 100) / 100
        },
        reservoir: Math.round((Math.random() * 200 + 50) * 10) / 10,
        clock: date.toISOString(),
        status: {
          status: Math.random() > 0.95 ? 'error' : 'normal',
          bolusing: Math.random() > 0.9,
          suspended: Math.random() > 0.95
        },
        iob: {
          timestamp: date.toISOString(),
          bolusiob: Math.round((Math.random() * 3) * 100) / 100,
          basaliob: Math.round((Math.random() * 2) * 100) / 100
        }
      }
    };

    statuses.push(status);
  }

  return statuses;
}

// Generate status info
function generateStatus(): ServerSettings & {
  status: string;
  serverTime: string;
  serverTimeEpoch: number;
} {
  return {
    status: 'ok',
    name: 'Nightscout Demo',
    version: '15.0.4-demo',
    serverTime: new Date().toISOString(),
    serverTimeEpoch: Date.now(),
    apiEnabled: true,
    careportalEnabled: true,
    boluscalcEnabled: true,
    head: 'demo-branch',
    runtimeState: 'demo',
    settings: {
      units: 'mg/dl',
      timeFormat: 24,
      nightMode: false,
      editMode: true,
      showRawbg: 'always',
      customTitle: 'Demo Nightscout',
      theme: 'default',
      alarmUrgentHigh: true,
      alarmHigh: true,
      alarmLow: true,
      alarmUrgentLow: true,
      alarmTimeagoWarn: true,
      alarmTimeagoUrgent: true,
      language: 'en'
    },
    extendedSettings: {
      devicestatus: {
        advanced: true
      }
    },
    authorized: {
      role: ['readable', 'api:entries:read', 'api:treatments:read', 'api:devicestatus:read']
    }
  };
}

// Add array.random() method for convenience
declare global {
  interface Array<T> {
    random(): T;
  }
}

if (!Array.prototype.random) {
  Array.prototype.random = function() {
    return this[Math.floor(Math.random() * this.length)];
  };
}

export const demoData = {
  generateSGVEntries,
  generateTreatments,
  generateDeviceStatus,
  generateStatus,

  // Pre-generated data sets
  entries: () => generateSGVEntries(),
  treatments: () => generateTreatments(),
  devicestatus: () => generateDeviceStatus(),
  status: () => generateStatus(),

  // Hourly stats (similar to example-hourly-stats.json)
  hourlyStats: () => {
    const stats = [];
    for (let hour = 0; hour < 24; hour++) {
      stats.push({
        hour,
        basalIob: Math.round((0.5 + Math.random() * 1.5) * 100) / 100,
        tempIob: Math.round((Math.random() * 0.8) * 100) / 100
      });
    }
    return stats;
  }
};
