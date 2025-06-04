import type { Treatment, DeviceStatus } from '$lib';
import type { IOBResult, IOBContribution, IOBProfile, LoopIOBData, OpenAPSIOBData, PumpIOBData } from './types.js';

// Type guards for IOB data
function hasLoopIOB(deviceStatus: DeviceStatus): deviceStatus is DeviceStatus & { loop: { iob: LoopIOBData } } {
  const loop = deviceStatus.loop as unknown;
  return !!(loop && typeof loop === 'object' && 'iob' in loop &&
    typeof (loop as { iob?: unknown }).iob === 'object' &&
    (loop as { iob: unknown }).iob !== null &&
    'iob' in (loop as { iob: object }).iob &&
    'timestamp' in (loop as { iob: object }).iob);
}

function hasOpenAPSIOB(deviceStatus: DeviceStatus): deviceStatus is DeviceStatus & { openaps: { iob: OpenAPSIOBData | OpenAPSIOBData[] } } {
  const openaps = deviceStatus.openaps as unknown;
  if (!(openaps && typeof openaps === 'object' && 'iob' in openaps)) {
    return false;
  }

  const iob = (openaps as { iob: unknown }).iob;
  if (Array.isArray(iob)) {
    return iob.length > 0 && typeof iob[0] === 'object' && iob[0] !== null && 'iob' in iob[0];
  }

  return !!(iob && typeof iob === 'object' && 'iob' in iob);
}

function hasPumpIOB(deviceStatus: DeviceStatus): deviceStatus is DeviceStatus & { pump: { iob: PumpIOBData } } {
  const pump = deviceStatus.pump as unknown;
  return !!(pump && typeof pump === 'object' && 'iob' in pump &&
    typeof (pump as { iob?: unknown }).iob === 'object' &&
    (pump as { iob: unknown }).iob !== null &&
    'timestamp' in (pump as { iob: object }).iob &&
    'bolusiob' in (pump as { iob: object }).iob);
}

// Constants
const RECENCY_THRESHOLD = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Main IOB calculation function that combines device status and treatment data
 */
export function calculateInsulinOnBoard(
  treatments: Treatment[],
  devicestatus: DeviceStatus[],
  profile?: IOBProfile,
  time?: number,
  spec_profile?: unknown
): IOBResult {
  if (time === undefined) {
    time = Date.now();
  }

  // Get IOB from device status (pumps, OpenAPS, Loop)
  let result = lastIOBDeviceStatus(devicestatus, time);

  // Calculate IOB from treatments (Care Portal entries)
  const treatmentResult = (treatments && treatments.length)
    ? fromTreatments(treatments, profile, time, spec_profile)
    : {};
  if (isEmpty(result)) {
    result = treatmentResult;
  } else {
    if (treatmentResult.iob) {
      result.treatmentIob = roundToThreeDecimals(treatmentResult.iob);
    }
    if (treatmentResult.basalIob) {
      // Add treatment basal IOB to device status basal IOB if available
      result.basalIob = (result.basalIob || 0) + treatmentResult.basalIob;
      result.basalIob = roundToThreeDecimals(result.basalIob);
    }
  }

  if (result.iob) {
    result.iob = roundToThreeDecimals(result.iob);
  }

  return addDisplay(result);
}

/**
 * Check if device status has IOB data available
 */
export function isDeviceStatusAvailable(devicestatus: DeviceStatus[]): boolean {
  return Array.isArray(devicestatus) && devicestatus
    .map(fromDeviceStatus)
    .filter(item => !isEmpty(item))
    .length > 0;
}

/**
 * Get the most recent IOB from device status entries
 */
export function lastIOBDeviceStatus(devicestatus: DeviceStatus[], time: number): IOBResult {
  if (!Array.isArray(devicestatus)) {
    return {};
  }

  let timeMs = time;  if (typeof time === 'object' && (time as Date).getTime) {
    timeMs = (time as Date).getTime();
  }

  const futureMills = timeMs + 5 * 60 * 1000; // Allow for clocks to be a little off
  const recentMills = timeMs - RECENCY_THRESHOLD;

  // Get all IOBs within time range
  const iobs = devicestatus
    .filter(status => status.mills && status.mills <= futureMills && status.mills >= recentMills)
    .map(fromDeviceStatus)
    .filter(item => !isEmpty(item))
    .sort((a, b) => (a.mills || 0) - (b.mills || 0));

  // Prioritize Loop IOBs if available
  const loopIOBs = iobs.filter(iob => iob.source === 'Loop');

  // Return the most recent IOB entry, preferring Loop entries if available
  return loopIOBs[loopIOBs.length - 1] || iobs[iobs.length - 1] || {};
}

/**
 * Get IOB device statuses within a time range
 */
export function IOBDeviceStatusesInTimeRange(
  devicestatus: DeviceStatus[],
  from: number,
  to: number
): IOBResult[] {
  if (!Array.isArray(devicestatus)) {
    return [];
  }

  return devicestatus
    .filter(status => status.mills && status.mills > from && status.mills < to)
    .map(fromDeviceStatus)
    .filter(item => !isEmpty(item))
    .sort((a, b) => (a.mills || 0) - (b.mills || 0));
}

/**
 * Extract IOB data from a device status entry
 */
export function fromDeviceStatus(devicestatusEntry: DeviceStatus): IOBResult {
  // Prioritize Loop IOB if available
  if (hasLoopIOB(devicestatusEntry)) {
    const iobLoop = devicestatusEntry.loop.iob;
    return {
      iob: iobLoop.iob,
      source: 'Loop',
      device: devicestatusEntry.device,
      mills: new Date(iobLoop.timestamp).getTime()
    };
  }

  // Next priority: OpenAPS IOB
  if (hasOpenAPSIOB(devicestatusEntry)) {
    const iobOpenAPS = devicestatusEntry.openaps.iob;
    const openAPSData = Array.isArray(iobOpenAPS) ? iobOpenAPS[0] : iobOpenAPS;

    if (isEmpty(openAPSData)) {
      return {};
    }

    // Convert time to timestamp if needed
    let timestamp = openAPSData.timestamp;
    if (openAPSData.time && !timestamp) {
      timestamp = openAPSData.time;
    }    return {
      iob: openAPSData.iob,
      basalIob: openAPSData.basaliob,
      activity: openAPSData.activity,
      source: 'OpenAPS',
      device: devicestatusEntry.device,
      mills: timestamp ? new Date(timestamp).getTime() : undefined
    };
  }
  // Last priority: Pump IOB
  if (hasPumpIOB(devicestatusEntry)) {
    const iobPump = devicestatusEntry.pump.iob;
    const hasConnect = 'connect' in devicestatusEntry;
    return {
      iob: iobPump.iob || iobPump.bolusIob,
      source: hasConnect ? 'MM Connect' : undefined,
      device: devicestatusEntry.device,
      mills: devicestatusEntry.mills
    };
  }

  return {};
}

/**
 * Calculate IOB from treatments (Care Portal entries)
 */
export function fromTreatments(
  treatments: Treatment[],
  profile?: IOBProfile,
  time?: number,
  spec_profile?: unknown
): IOBResult {
  let totalIOB = 0;
  let totalActivity = 0;
  let totalBasalIOB = 0;
  let lastBolus: Treatment | null = null;

  const currentTime = time || Date.now();

  treatments?.forEach(treatment => {
    const treatmentMills = treatment.mills || new Date(treatment.created_at).getTime();

    if (treatmentMills <= currentTime) {
      // Calculate bolus IOB from treatments with insulin
      if (treatment.insulin) {
        const tIOB = calcTreatment(treatment, profile, currentTime, spec_profile);

        if (tIOB.iobContrib > 0) {
          lastBolus = treatment;
        }

        if (tIOB?.iobContrib) {
          totalIOB += tIOB.iobContrib;
        }

        if (tIOB?.activityContrib) {
          totalActivity += tIOB.activityContrib;
        }
      }

      // Calculate basal IOB from temp basal treatments
      if (treatment.eventType === 'Temp Basal' && treatment.duration) {
        const basalIOB = calcBasalTreatment(treatment, profile, currentTime, spec_profile);

        if (basalIOB?.iobContrib) {
          totalBasalIOB += basalIOB.iobContrib;
        }

        if (basalIOB?.activityContrib) {
          totalActivity += basalIOB.activityContrib;
        }
      }
    }
  });

  return {
    iob: roundToThreeDecimals(totalIOB),
    basalIob: roundToThreeDecimals(totalBasalIOB),
    activity: totalActivity,
    lastBolus,
    source: 'Care Portal'
  };
}

/**
 * Calculate IOB contribution from a single treatment
 */
export function calcTreatment(
  treatment: Treatment,
  profile?: IOBProfile,
  time?: number,
  spec_profile?: unknown
): IOBContribution {
  let dia = 3; // Default DIA
  let sens = 0;

  if (profile) {
    dia = profile.getDIA?.(time || Date.now(), spec_profile) || 3;
    sens = profile.getSensitivity?.(time || Date.now(), spec_profile) || 0;
  }

  const scaleFactor = 3.0 / dia;
  const peak = 75;
  const result: IOBContribution = {
    iobContrib: 0,
    activityContrib: 0
  };

  if (treatment.insulin) {
    const bolusTime = treatment.mills || new Date(treatment.created_at).getTime();
    const minAgo = scaleFactor * ((time || Date.now()) - bolusTime) / 1000 / 60;

    if (minAgo < peak) {
      const x1 = minAgo / 5 + 1;
      result.iobContrib = treatment.insulin * (1 - 0.001852 * x1 * x1 + 0.001852 * x1);
      result.activityContrib = sens * treatment.insulin * (2 / dia / 60 / peak) * minAgo;
    } else if (minAgo < 180) {
      const x2 = (minAgo - 75) / 5;
      result.iobContrib = treatment.insulin * (0.001323 * x2 * x2 - 0.054233 * x2 + 0.55556);
      result.activityContrib = sens * treatment.insulin * (2 / dia / 60 - (minAgo - peak) * 2 / dia / 60 / (60 * 3 - peak));
    }
  }

  return result;
}

/**
 * Calculate basal IOB contribution from a single temp basal treatment
 */
export function calcBasalTreatment(
  treatment: Treatment,
  profile?: IOBProfile,
  time?: number,
  spec_profile?: unknown
): IOBContribution {
  let dia = 3; // Default DIA
  let sens = 0;

  if (profile) {
    dia = profile.getDIA?.(time || Date.now(), spec_profile) || 3;
    sens = profile.getSensitivity?.(time || Date.now(), spec_profile) || 0;
  }

  const result: IOBContribution = {
    iobContrib: 0,
    activityContrib: 0
  };

  // Only process temp basal treatments
  if (treatment.eventType !== 'Temp Basal' || !treatment.duration) {
    return result;
  }

  const currentTime = time || Date.now();
  const treatmentTime = treatment.mills || new Date(treatment.created_at).getTime();
  const treatmentEndTime = treatmentTime + (treatment.duration * 60 * 1000); // duration in minutes

  // Only calculate if treatment is active or recently ended (within DIA period)
  const diaMillis = dia * 60 * 60 * 1000; // DIA in milliseconds
  if (currentTime < treatmentTime || currentTime > treatmentEndTime + diaMillis) {
    return result;
  }
  // Calculate the effective insulin rate during the temp basal period
  let basalRate = 0;
  if (treatment.absolute !== undefined) {
    // Absolute temp basal rate in U/h
    basalRate = treatment.absolute;
  } else if (treatment.percent !== undefined) {
    // Percentage temp basal - need profile basal rate to calculate absolute
    // For now, use a default profile rate of 1.0 U/h if profile not available
    const profileBasalRate = 1.0; // This should ideally come from profile
    basalRate = profileBasalRate * (treatment.percent / 100);
  }

  if (basalRate <= 0) {
    return result;
  }

  // Calculate insulin delivered during the active period
  let deliveredInsulin = 0;

  if (currentTime <= treatmentEndTime) {
    // Treatment is still active - calculate insulin delivered so far
    const activeMinutes = (currentTime - treatmentTime) / (60 * 1000);
    deliveredInsulin = (basalRate * activeMinutes) / 60; // Convert to units
  } else {
    // Treatment has ended - calculate total insulin delivered
    const totalMinutes = treatment.duration;
    deliveredInsulin = (basalRate * totalMinutes) / 60; // Convert to units

    // Apply IOB decay curve for insulin delivered after treatment ended
    const timeSinceEnd = currentTime - treatmentEndTime;
    const minSinceEnd = timeSinceEnd / (60 * 1000);

    // Use simplified exponential decay for basal IOB
    const decayFactor = Math.exp(-minSinceEnd / (dia * 60 / 2)); // Half-life based decay
    deliveredInsulin *= decayFactor;
  }

  // Apply IOB calculation similar to bolus, but adjusted for continuous delivery
  if (deliveredInsulin > 0) {
    const scaleFactor = 3.0 / dia;
    const treatmentAge = (currentTime - treatmentTime) / (60 * 1000); // minutes
    const minAgo = scaleFactor * treatmentAge;
    const peak = 75;

    if (minAgo < peak) {
      const x1 = minAgo / 5 + 1;
      result.iobContrib = deliveredInsulin * (1 - 0.001852 * x1 * x1 + 0.001852 * x1);
      result.activityContrib = sens * deliveredInsulin * (2 / dia / 60 / peak) * minAgo;
    } else if (minAgo < 180) {
      const x2 = (minAgo - 75) / 5;
      result.iobContrib = deliveredInsulin * (0.001323 * x2 * x2 - 0.054233 * x2 + 0.55556);
      result.activityContrib = sens * deliveredInsulin * (2 / dia / 60 - (minAgo - peak) * 2 / dia / 60 / (60 * 3 - peak));
    }
  }

  return result;
}

/**
 * Calculate IOB from basal treatments (temp basals)
 */
export function fromBasalTreatments(
  treatments: Treatment[],
  profile?: IOBProfile,
  time?: number,
  spec_profile?: unknown
): IOBResult {
  let totalBasalIOB = 0;
  let totalActivity = 0;

  const currentTime = time || Date.now();

  treatments?.forEach(treatment => {
    if (treatment.eventType === 'Temp Basal') {
      const treatmentMills = treatment.mills || new Date(treatment.created_at).getTime();

      if (treatmentMills <= currentTime) {
        const basalIOB = calcBasalTreatment(treatment, profile, currentTime, spec_profile);

        if (basalIOB?.iobContrib) {
          totalBasalIOB += basalIOB.iobContrib;
        }

        if (basalIOB?.activityContrib) {
          totalActivity += basalIOB.activityContrib;
        }
      }
    }
  });

  return {
    basalIob: roundToThreeDecimals(totalBasalIOB),
    activity: totalActivity,
    source: 'Care Portal'
  };
}

/**
 * Add display formatting to IOB result
 */
function addDisplay(iob: IOBResult): IOBResult {
  if (isEmpty(iob) || iob.iob === undefined) {
    return {};
  }

  const display = iob.iob.toFixed(2);

  return {
    ...iob,
    display,
    displayLine: `IOB: ${display}U`
  };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use calcTotal instead
 */
export function calculateIOBForTime(treatments: Treatment[], targetTime: number): { basalIob: number; tempIob: number } {
  const result = fromTreatments(treatments, undefined, targetTime);

  return {
    basalIob: result.basalIob || 0,
    tempIob: result.iob || 0
  };
}

// Utility functions
function isEmpty(obj: unknown): boolean {
  if (obj == null) return true;
  if (typeof obj === 'object') {
    return Object.keys(obj).length === 0;
  }
  return false;
}

function roundToThreeDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 1000) / 1000;
}
