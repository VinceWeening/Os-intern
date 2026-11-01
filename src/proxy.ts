import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicConfig } from '@/lib/config';
import { timedFetch } from '@/lib/supabase/fetch';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getPublicConfig();
  if (config) {
    // Deployment env is server-only; previews must never use production config.
    if ((process.env.VERCEL_ENV === 'production' && config.environment !== 'production') ||
        (process.env.VERCEL_ENV === 'preview' && config.environment !== 'test')) {
      return new NextResponse('Omgevingsconfiguratie onjuist.', { status: 503 });
    }
    const supabase = createServerClient(config.url, config.key, {
      global: { fetch: timedFetch },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(items) {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // Refreshes an expired session and verifies the JWT signature locally
    // (asymmetric keys, cached JWKS). Pages still check the user with Auth.
    await supabase.auth.getClaims();
  }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|icon|apple-icon|manifest.webmanifest|favicon.ico).*)'] };
