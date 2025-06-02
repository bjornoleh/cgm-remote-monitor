// Clock face configuration types and parser
export interface ClockConfig {
  bgColor: boolean;
  alwaysShowTime: boolean;
  staleMinutes: number;
  elements: ClockElement[];
}

export interface ClockElement {
  type: 'sg' | 'dt' | 'ar' | 'ag' | 'nl' | 'time';
  size?: number;
  position?: string;
  visible: boolean;
}

export function parseClockFace(faceParam: string): ClockConfig {
  let parsedFace = faceParam.toLowerCase();

  // Handle backward compatibility mappings
  const faceMap: Record<string, string> = {
    'clock-color': 'cy13-sg35-dt14-nl-ar25-nl-ag6',
    'clock': 'bn0-sg40',
    'bgclock': 'by13-sg35-dt14-nl-ar25-nl-ag6',
    'simple': 'bn0-sg60',
    'large': 'cn0-sg80-time30'
  };

  if (faceMap[parsedFace]) {
    parsedFace = faceMap[parsedFace];
  }

  const faceParams = parsedFace.split('-');

  const config: ClockConfig = {
    bgColor: false,
    alwaysShowTime: false,
    staleMinutes: 13,
    elements: []
  };

  for (let i = 0; i < faceParams.length; i++) {
    const param = faceParams[i];

    if (i === 0) {
      // First parameter: background color, time display, and stale threshold
      // Format: [b|c][y|n][NN] where b=black bg, c=color bg, y=always show time, n=conditional time, NN=stale minutes
      config.bgColor = param.charAt(0) === 'c';
      config.alwaysShowTime = param.charAt(1) === 'y';

      const staleStr = param.substring(2);
      const staleVal = parseInt(staleStr);
      config.staleMinutes = isNaN(staleVal) ? 13 : staleVal;
    } else {
      // Parse element parameters
      const element = parseElement(param);
      if (element) {
        config.elements.push(element);
      }
    }
  }

  return config;
}

function parseElement(param: string): ClockElement | null {
  if (param === 'nl') {
    return { type: 'nl', visible: true }; // New line
  }

  // Extract element type and size
  const match = param.match(/^([a-z]+)(\d+)?$/);
  if (!match) return null;

  const [, type, sizeStr] = match;
  const size = sizeStr ? parseInt(sizeStr) : undefined;

  switch (type) {
    case 'sg': // Sugar/BG value
      return { type: 'sg', size, visible: true };
    case 'dt': // Delta
      return { type: 'dt', size, visible: true };
    case 'ar': // Arrow
      return { type: 'ar', size, visible: true };
    case 'ag': // Age/time since last reading
      return { type: 'ag', size, visible: true };
    case 'time': // Current time
      return { type: 'time', size, visible: true };
    default:
      return null;
  }
}

export function getElementStyle(element: ClockElement, isStale: boolean, bgColor: boolean): string {
  const baseSize = element.size || 40;
  const styles = [`font-size: ${baseSize}px`];

  if (element.type === 'sg' && isStale) {
    styles.push('text-decoration: line-through', 'opacity: 0.6');
  }

  if (element.type === 'ar') {
    const brightness = isStale ? '0%' : (bgColor ? '100%' : '50%');
    styles.push(`filter: brightness(${brightness})`);
  }

  return styles.join('; ');
}
