import type { Treatment, DeviceStatus } from '$lib/stores/client-state.svelte.ts';
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
export function calcTotal(
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
  } else if (treatmentResult.iob) {
    result.treatmentIob = roundToThreeDecimals(treatmentResult.iob);
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
    }

    return {
      iob: openAPSData.iob,
      basaliob: openAPSData.basaliob,
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
      iob: iobPump.iob || iobPump.bolusiob,
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
  let lastBolus: Treatment | null = null;

  const currentTime = time || Date.now();

  treatments?.forEach(treatment => {
    const treatmentMills = treatment.mills || new Date(treatment.created_at).getTime();

    if (treatmentMills <= currentTime) {
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
  });

  return {
    iob: roundToThreeDecimals(totalIOB),
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
    basalIob: result.basaliob || 0,
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
