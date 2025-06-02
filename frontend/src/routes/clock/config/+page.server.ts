import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  // Server-side configuration loading
  const searchParams = url.searchParams;
  const presetFace = searchParams.get('face');

  // Here you could load server-side configuration defaults,
  // validate against server settings, or load user preferences from database

  const serverConfig = {
    maxStaleMinutes: 60,
    allowedElements: ['sg', 'dt', 'ar', 'ag', 'time'],
    sizeConstraints: {
      sg: { min: 20, max: 80 },
      dt: { min: 10, max: 40 },
      ar: { min: 15, max: 50 },
      ag: { min: 8, max: 24 },
      time: { min: 16, max: 48 }
    }
  };

  return {
    serverConfig,
    presetFace,
    timestamp: Date.now()
  };
};
