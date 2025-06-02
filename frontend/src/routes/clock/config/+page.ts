// Clock configuration page load function and utilities
import type { PageLoad } from './$types';

export interface ClockConfigElements {
  sg: { enabled: boolean; size: number };
  dt: { enabled: boolean; size: number };
  ar: { enabled: boolean; size: number };
  ag: { enabled: boolean; size: number };
  time: { enabled: boolean; size: number };
}

export interface ClockConfiguration {
  bgColor: boolean;
  alwaysShowTime: boolean;
  staleMinutes: number;
  elements: ClockConfigElements;
}

export const _defaultConfiguration: ClockConfiguration = {
  bgColor: false,
  alwaysShowTime: false,
  staleMinutes: 13,
  elements: {
    sg: { enabled: true, size: 35 },
    dt: { enabled: true, size: 14 },
    ar: { enabled: true, size: 25 },
    ag: { enabled: true, size: 6 },
    time: { enabled: false, size: 30 }
  }
};

/**
 * Generate face string from configuration
 */
export function _generateFaceString(config: ClockConfiguration): string {
  const bgPrefix = config.bgColor ? 'c' : 'b';
  const timePrefix = config.alwaysShowTime ? 'y' : 'n';
  const staleStr = config.staleMinutes.toString().padStart(2, '0');

  let faceString = `${bgPrefix}${timePrefix}${staleStr}`;

  if (config.elements.sg.enabled) {
    faceString += `-sg${config.elements.sg.size}`;
  }

  if (config.elements.dt.enabled) {
    faceString += `-dt${config.elements.dt.size}`;
  }

  faceString += '-nl'; // Add newline

  if (config.elements.ar.enabled) {
    faceString += `-ar${config.elements.ar.size}`;
  }

  faceString += '-nl'; // Add newline

  if (config.elements.ag.enabled) {
    faceString += `-ag${config.elements.ag.size}`;
  }

  if (config.elements.time.enabled) {
    faceString += `-time${config.elements.time.size}`;
  }

  return faceString;
}

/**
 * Validate configuration values
 */
export function _validateConfiguration(config: Partial<ClockConfiguration>): ClockConfiguration {
  const validated: ClockConfiguration = {
    bgColor: config.bgColor ?? _defaultConfiguration.bgColor,
    alwaysShowTime: config.alwaysShowTime ?? _defaultConfiguration.alwaysShowTime,
    staleMinutes: Math.max(0, Math.min(60, config.staleMinutes ?? _defaultConfiguration.staleMinutes)),
    elements: {
      sg: {
        enabled: config.elements?.sg?.enabled ?? _defaultConfiguration.elements.sg.enabled,
        size: Math.max(20, Math.min(80, config.elements?.sg?.size ?? _defaultConfiguration.elements.sg.size))
      },
      dt: {
        enabled: config.elements?.dt?.enabled ?? _defaultConfiguration.elements.dt.enabled,
        size: Math.max(10, Math.min(40, config.elements?.dt?.size ?? _defaultConfiguration.elements.dt.size))
      },
      ar: {
        enabled: config.elements?.ar?.enabled ?? _defaultConfiguration.elements.ar.enabled,
        size: Math.max(15, Math.min(50, config.elements?.ar?.size ?? _defaultConfiguration.elements.ar.size))
      },
      ag: {
        enabled: config.elements?.ag?.enabled ?? _defaultConfiguration.elements.ag.enabled,
        size: Math.max(8, Math.min(24, config.elements?.ag?.size ?? _defaultConfiguration.elements.ag.size))
      },
      time: {
        enabled: config.elements?.time?.enabled ?? _defaultConfiguration.elements.time.enabled,
        size: Math.max(16, Math.min(48, config.elements?.time?.size ?? _defaultConfiguration.elements.time.size))
      }
    }
  };

  return validated;
}

export const load: PageLoad = async ({ url }) => {
  // Extract any URL parameters that might affect configuration
  const searchParams = url.searchParams;
  const presetFace = searchParams.get('face');
    return {
    _defaultConfiguration,
    presetFace,
    meta: {
      title: 'Clock Configuration - Nightscout',
      description: 'Configure your Nightscout clock display settings'
    }
  };
};
