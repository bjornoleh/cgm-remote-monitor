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

// Generate realistic blood glucose readings with some variability
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

  for (let i = 0; i < count; i++) {
    const mills = now - (i * interval);
    const date = new Date(mills);
    const hour = date.getHours();

    // Add some randomness and trends
    const baseBG = getBaseBG(hour);
    const randomVariation = (Math.random() - 0.5) * 40; // ±20 mg/dL
    const trendVariation = Math.sin(i * 0.1) * 15; // Gentle trending

    let sgv = Math.round(baseBG + randomVariation + trendVariation);
    sgv = Math.max(40, Math.min(400, sgv)); // Keep in reasonable range

    // Calculate direction based on previous reading
    let direction = 'Flat';
    if (i > 0) {
      const prevSGV = entries[0].sgv || entries[0].mgdl || 100;
      const change = sgv - prevSGV;
      if (change > 5) direction = 'SingleUp';
      else if (change > 2) direction = 'FortyFiveUp';
      else if (change < -5) direction = 'SingleDown';
      else if (change < -2) direction = 'FortyFiveDown';
      else if (change > 8) direction = 'DoubleUp';
      else if (change < -8) direction = 'DoubleDown';
    }    const entry: Entry = {
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
}// Generate various types of treatments
function generateTreatments(count: number = 50): Treatment[] {
  const treatments: Treatment[] = [];
  const now = Date.now();
  const eventTypes = [
    'Meal Bolus',
    'Correction Bolus',
    'Carb Correction',
    'Combo Bolus',
    'Snack Bolus',
    'Site Change',
    'Sensor Start',
    'Insulin Change',
    'Pump Battery Change',
    'Exercise',
    'Note',
    'BG Check',
    'Temp Basal',
    'Profile Switch',
    'Announcement'
  ];

  for (let i = 0; i < count; i++) {
    const mills = now - (Math.random() * 7 * 24 * 60 * 60 * 1000); // Random within last week
    const date = new Date(mills);
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const treatment: Treatment = {
      _id: `demo_treatment_${mills}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      created_at: date.toISOString(),
      timestamp: date.toISOString(),
      enteredBy: ['Dad', 'Mom', 'Kiddo', 'Auto'][Math.floor(Math.random() * 4)],
      mills
    };

    // Add type-specific properties
    switch (eventType) {
      case 'Meal Bolus':
      case 'Snack Bolus':
        treatment.carbs = Math.floor(Math.random() * 80) + 10;
        treatment.insulin = Math.round((treatment.carbs * (0.1 + Math.random() * 0.05)) * 100) / 100;
        treatment.notes = ['Pizza', 'Pasta', 'Salad', 'Sandwich', 'Cereal', 'Fruit'][Math.floor(Math.random() * 6)];
        break;

      case 'Correction Bolus':
        treatment.insulin = Math.round((Math.random() * 2 + 0.2) * 100) / 100;
        treatment.glucose = Math.floor(Math.random() * 100) + 150;
        treatment.glucoseType = 'Finger';
        break;

      case 'Combo Bolus':
        treatment.carbs = Math.floor(Math.random() * 60) + 20;
        treatment.insulin = Math.round((treatment.carbs * 0.12) * 100) / 100;
        treatment.duration = [60, 90, 120, 180][Math.floor(Math.random() * 4)];
        break;

      case 'Site Change':
        treatment.notes = 'Changed pump site';
        break;

      case 'Sensor Start':
        treatment.notes = 'Started new sensor';
        break;

      case 'Insulin Change':
        treatment.notes = 'Changed insulin cartridge';
        break;

      case 'Temp Basal':
        treatment.percent = Math.floor(Math.random() * 150) + 50;
        treatment.duration = [30, 60, 90, 120][Math.floor(Math.random() * 4)];
        break;

      case 'BG Check':
        treatment.glucose = Math.floor(Math.random() * 200) + 70;
        treatment.glucoseType = 'Finger';
        break;

      case 'Exercise':
        treatment.duration = Math.floor(Math.random() * 90) + 15;
        treatment.notes = ['Running', 'Walking', 'Swimming', 'Cycling', 'Gym'][Math.floor(Math.random() * 5)];
        break;

      default:
        treatment.notes = 'Demo treatment';
    }

    treatments.push(treatment);
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
