// Demo data generator for development without live server connection
import type { Entry, Treatment, DeviceStatus, ServerSettings } from '../stores/client-state.svelte.ts';
import type { FoodRecord, QuickPickRecord } from '../../routes/food/types.ts';

// Profile interfaces
interface TimeValue {
  time: string;
  value: number;
}

interface ProfileData {
  dia: number;
  carbs_hr: number;
  delay: number;
  basal: TimeValue[];
  carbratio: TimeValue[];
  sens: TimeValue[];
  target_low: TimeValue[];
  target_high: TimeValue[];
  timezone: string;
  units: string;
  carbs_hr_high: number;
  carbs_hr_medium: number;
  carbs_hr_low: number;
  delay_high: number;
  delay_medium: number;
  delay_low: number;
}

interface Profile {
  _id: string;
  defaultProfile: string;
  startDate: string;
  mills: number;
  created_at: string;
  store: Record<string, ProfileData>;
}

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

// Generate profile data matching Nightscout profile structure
function generateProfile(): Profile {
  const now = Date.now();
  const today = new Date();

  // Generate realistic basal rates throughout the day (typical patterns)
  const basalRates = [
    { time: '00:00', value: 0.8 },   // Midnight - lower
    { time: '02:00', value: 0.7 },   // Early morning - lowest
    { time: '04:00', value: 0.9 },   // Dawn phenomenon starts
    { time: '06:00', value: 1.1 },   // Dawn phenomenon peak
    { time: '08:00', value: 1.0 },   // Morning
    { time: '11:00', value: 0.9 },   // Late morning
    { time: '14:00', value: 0.95 },  // Afternoon
    { time: '17:00', value: 1.0 },   // Evening
    { time: '20:00', value: 0.9 },   // Night
    { time: '22:00', value: 0.85 }   // Late night
  ];

  // Generate insulin-to-carb ratios (I:C) - typically higher (more insulin) in morning
  const carbRatios = [
    { time: '00:00', value: 12 },    // Midnight
    { time: '06:00', value: 8 },     // Breakfast - more insulin needed
    { time: '11:00', value: 10 },    // Lunch
    { time: '17:00', value: 12 },    // Dinner
    { time: '21:00', value: 14 }     // Late evening snacks
  ];

  // Generate insulin sensitivity factors (ISF) - how much 1 unit drops BG
  const insulinSensitivity = [
    { time: '00:00', value: 45 },    // Midnight
    { time: '06:00', value: 35 },    // Morning - less sensitive (dawn phenomenon)
    { time: '11:00', value: 40 },    // Late morning
    { time: '17:00', value: 45 },    // Evening
    { time: '21:00', value: 50 }     // Night - more sensitive
  ];

  // Generate target BG ranges
  const targetLow = [
    { time: '00:00', value: 100 },
    { time: '06:00', value: 90 },    // Tighter morning target
    { time: '22:00', value: 110 }    // Higher nighttime target for safety
  ];

  const targetHigh = [
    { time: '00:00', value: 120 },
    { time: '06:00', value: 110 },   // Tighter morning target
    { time: '22:00', value: 140 }    // Higher nighttime target for safety
  ];

  // Create the main profile object
  const profileData = {
    dia: 4, // Duration of insulin action (hours)
    carbs_hr: 20, // Carbs absorbed per hour
    delay: 20, // Carb absorption delay (minutes)

    // Time-based arrays
    basal: basalRates,
    carbratio: carbRatios,
    sens: insulinSensitivity,
    target_low: targetLow,
    target_high: targetHigh,

    // Additional fields for advanced features
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    units: 'mg/dl',

    // Extended carb settings (for COB plugin)
    carbs_hr_high: 30,   // Fast-acting carbs (candy, juice)
    carbs_hr_medium: 20, // Medium carbs (bread, pasta)
    carbs_hr_low: 10,    // Slow carbs (oats, beans)

    delay_high: 10,      // Delay for fast carbs
    delay_medium: 20,    // Delay for medium carbs
    delay_low: 30        // Delay for slow carbs
  };

  // Create the full profile structure as used by Nightscout
  const fullProfile = {
    _id: `demo_profile_${now}`,
    defaultProfile: 'Default',
    startDate: today.toISOString(),
    mills: now,
    created_at: today.toISOString(),
    store: {
      'Default': profileData,
      'Exercise': {
        // Exercise profile with reduced basal rates
        ...profileData,
        basal: basalRates.map(rate => ({
          ...rate,
          value: Math.round((rate.value * 0.75) * 100) / 100 // 25% reduction
        })),
        target_low: targetLow.map(target => ({
          ...target,
          value: target.value + 20 // Higher targets during exercise
        })),
        target_high: targetHigh.map(target => ({
          ...target,
          value: target.value + 30
        }))
      },
      'Sick Day': {
        // Sick day profile with increased basal rates
        ...profileData,
        basal: basalRates.map(rate => ({
          ...rate,
          value: Math.round((rate.value * 1.2) * 100) / 100 // 20% increase
        })),
        sens: insulinSensitivity.map(sens => ({
          ...sens,
          value: Math.round(sens.value * 0.8) // More aggressive corrections
        }))
      }
    }
  };

  return fullProfile;
}

// Generate realistic food database entries
function generateFoodItems(count: number = 100): FoodRecord[] {
  const foodItems: FoodRecord[] = [];
  const now = Date.now();

  // Define food data with realistic nutritional information
  const foodDatabase = [
    // Fruits
    { category: 'Fruits', subcategory: 'Citrus', name: 'Orange', portion: 150, carbs: 12, fat: 0, protein: 1, gi: 2, unit: 'g' },
    { category: 'Fruits', subcategory: 'Citrus', name: 'Grapefruit', portion: 200, carbs: 11, fat: 0, protein: 1, gi: 1, unit: 'g' },
    { category: 'Fruits', subcategory: 'Berries', name: 'Strawberries', portion: 100, carbs: 6, fat: 0, protein: 1, gi: 2, unit: 'g' },
    { category: 'Fruits', subcategory: 'Berries', name: 'Blueberries', portion: 100, carbs: 11, fat: 0, protein: 1, gi: 2, unit: 'g' },
    { category: 'Fruits', subcategory: 'Stone Fruits', name: 'Apple', portion: 150, carbs: 19, fat: 0, protein: 0, gi: 2, unit: 'g' },
    { category: 'Fruits', subcategory: 'Tropical', name: 'Banana', portion: 120, carbs: 23, fat: 0, protein: 1, gi: 2, unit: 'g' },

    // Vegetables
    { category: 'Vegetables', subcategory: 'Leafy Greens', name: 'Spinach', portion: 100, carbs: 4, fat: 0, protein: 3, gi: 1, unit: 'g' },
    { category: 'Vegetables', subcategory: 'Cruciferous', name: 'Broccoli', portion: 100, carbs: 7, fat: 0, protein: 3, gi: 1, unit: 'g' },
    { category: 'Vegetables', subcategory: 'Root Vegetables', name: 'Carrots', portion: 100, carbs: 10, fat: 0, protein: 1, gi: 3, unit: 'g' },
    { category: 'Vegetables', subcategory: 'Legumes', name: 'Black Beans', portion: 100, carbs: 23, fat: 1, protein: 9, gi: 1, unit: 'g' },

    // Grains
    { category: 'Grains', subcategory: 'Whole Grains', name: 'Brown Rice', portion: 100, carbs: 23, fat: 2, protein: 5, gi: 2, unit: 'g' },
    { category: 'Grains', subcategory: 'Refined Grains', name: 'White Rice', portion: 100, carbs: 28, fat: 0, protein: 3, gi: 3, unit: 'g' },
    { category: 'Grains', subcategory: 'Whole Grains', name: 'Oatmeal', portion: 100, carbs: 12, fat: 2, protein: 2, gi: 2, unit: 'g' },
    { category: 'Grains', subcategory: 'Refined Grains', name: 'White Bread', portion: 30, carbs: 15, fat: 1, protein: 3, gi: 3, unit: 'g' },

    // Protein
    { category: 'Protein', subcategory: 'Poultry', name: 'Chicken Breast', portion: 100, carbs: 0, fat: 3, protein: 31, gi: 1, unit: 'g' },
    { category: 'Protein', subcategory: 'Fish', name: 'Salmon', portion: 100, carbs: 0, fat: 13, protein: 25, gi: 1, unit: 'g' },
    { category: 'Protein', subcategory: 'Plant-Based', name: 'Tofu', portion: 100, carbs: 2, fat: 8, protein: 15, gi: 1, unit: 'g' },
    { category: 'Protein', subcategory: 'Meat', name: 'Ground Beef', portion: 100, carbs: 0, fat: 20, protein: 26, gi: 1, unit: 'g' },

    // Dairy
    { category: 'Dairy', subcategory: 'Milk', name: 'Whole Milk', portion: 240, carbs: 11, fat: 8, protein: 8, gi: 1, unit: 'ml' },
    { category: 'Dairy', subcategory: 'Cheese', name: 'Cheddar Cheese', portion: 30, carbs: 1, fat: 9, protein: 7, gi: 1, unit: 'g' },
    { category: 'Dairy', subcategory: 'Yogurt', name: 'Greek Yogurt', portion: 170, carbs: 6, fat: 0, protein: 17, gi: 1, unit: 'g' },

    // Fats
    { category: 'Fats', subcategory: 'Nuts', name: 'Almonds', portion: 30, carbs: 6, fat: 14, protein: 6, gi: 1, unit: 'g' },
    { category: 'Fats', subcategory: 'Oils', name: 'Olive Oil', portion: 15, carbs: 0, fat: 14, protein: 0, gi: 1, unit: 'ml' },
    { category: 'Fats', subcategory: 'Seeds', name: 'Chia Seeds', portion: 15, carbs: 6, fat: 5, protein: 3, gi: 1, unit: 'g' },

    // Snacks and treats
    { category: 'Snacks', subcategory: 'Sweet', name: 'Dark Chocolate', portion: 20, carbs: 13, fat: 6, protein: 2, gi: 2, unit: 'g' },
    { category: 'Snacks', subcategory: 'Savory', name: 'Crackers', portion: 30, carbs: 20, fat: 3, protein: 3, gi: 3, unit: 'g' },
    { category: 'Beverages', subcategory: 'Juice', name: 'Orange Juice', portion: 240, carbs: 26, fat: 0, protein: 2, gi: 3, unit: 'ml' }
  ];

  // Generate the requested number of food items
  for (let i = 0; i < count; i++) {
    const baseFood = foodDatabase[i % foodDatabase.length];
    const variation = Math.floor(i / foodDatabase.length) + 1;

    // Add some variation to the base foods
    const portionVariation = 1 + (Math.random() - 0.5) * 0.3; // ±15% variation
    const carbVariation = 1 + (Math.random() - 0.5) * 0.2; // ±10% variation

    const foodItem: FoodRecord = {
      _id: `food_${now}_${i}`,
      type: 'food',
      category: baseFood.category,
      subcategory: baseFood.subcategory,
      name: variation > 1 ? `${baseFood.name} (${variation})` : baseFood.name,
      portion: Math.round(baseFood.portion * portionVariation),
      carbs: Math.round(baseFood.carbs * carbVariation),
      fat: baseFood.fat,
      protein: baseFood.protein,
      energy: Math.round((baseFood.carbs * carbVariation * 4 + baseFood.fat * 9 + baseFood.protein * 4) * 4.184), // Convert to kJ
      gi: baseFood.gi,
      unit: baseFood.unit
    };

    foodItems.push(foodItem);
  }

  return foodItems;
}

// Generate quick pick combinations
function generateQuickPicks(count: number = 10): QuickPickRecord[] {
  const quickPicks: QuickPickRecord[] = [];
  const now = Date.now();

  const quickPickTemplates = [
    {
      name: 'Breakfast Combo',
      foods: [
        { name: 'Oatmeal', carbs: 30, portions: 1 },
        { name: 'Banana', carbs: 23, portions: 1 },
        { name: 'Whole Milk', carbs: 11, portions: 1 }
      ]
    },
    {
      name: 'Lunch Special',
      foods: [
        { name: 'Chicken Breast', carbs: 0, portions: 1 },
        { name: 'Brown Rice', carbs: 45, portions: 1 },
        { name: 'Broccoli', carbs: 7, portions: 1 }
      ]
    },
    {
      name: 'Snack Attack',
      foods: [
        { name: 'Apple', carbs: 19, portions: 1 },
        { name: 'Cheddar Cheese', carbs: 1, portions: 1 }
      ]
    },
    {
      name: 'Pasta Night',
      foods: [
        { name: 'Whole Wheat Pasta', carbs: 37, portions: 1 },
        { name: 'Marinara Sauce', carbs: 8, portions: 1 },
        { name: 'Ground Beef', carbs: 0, portions: 1 }
      ]
    }
  ];

  for (let i = 0; i < count; i++) {
    const template = quickPickTemplates[i % quickPickTemplates.length];
    const variation = Math.floor(i / quickPickTemplates.length) + 1;

    const totalCarbs = template.foods.reduce((sum, food) => sum + food.carbs * food.portions, 0);

    const quickPick: QuickPickRecord = {
      _id: `quickpick_${now}_${i}`,
      type: 'quickpick',
      name: variation > 1 ? `${template.name} ${variation}` : template.name,
      foods: template.foods.map((food, index) => ({
        _id: `qp_food_${now}_${i}_${index}`,
        type: 'food' as const,
        category: 'Quick Pick',
        subcategory: 'Combo',
        name: food.name,
        portion: 100,
        carbs: food.carbs,
        fat: 0,
        protein: 0,
        energy: food.carbs * 4 * 4.184,
        gi: 2,
        unit: 'g',
        portions: food.portions
      })),
      carbs: totalCarbs,
      hideafteruse: i % 3 === 0, // Every 3rd quick pick hides after use
      hidden: false,
      position: i
    };

    quickPicks.push(quickPick);
  }

  return quickPicks;
}

export const demoData = {
  generateSGVEntries,
  generateTreatments,
  generateDeviceStatus,
  generateStatus,
  generateProfile,
  generateFoodItems,
  generateQuickPicks,

  // Pre-generated data sets
  entries: () => generateSGVEntries(),
  treatments: () => generateTreatments(),
  devicestatus: () => generateDeviceStatus(),
  status: () => generateStatus(),
  profile: () => generateProfile(),
  food: () => generateFoodItems(),
  quickpicks: () => generateQuickPicks(),

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
