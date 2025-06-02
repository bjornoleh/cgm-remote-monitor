import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  // Extract query parameters that might be relevant for clock configuration
  const searchParams = url.searchParams;
  const face: string | null = searchParams.get('face');
  const token: string | null = searchParams.get('token');
  const secret: string | null = searchParams.get('secret');

  return {
    face,
    token,
    secret,
    // Any server-side configuration could be added here
    clockConfig: {
      face,
      timestamp: Date.now()
    }
  };
};
