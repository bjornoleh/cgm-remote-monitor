import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
  const face: string = params.face;

  // Extract query parameters that might be relevant for clock configuration
  const searchParams = url.searchParams;
  const token: string | undefined = searchParams.get('token');
  const secret: string | undefined = searchParams.get('secret');

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
