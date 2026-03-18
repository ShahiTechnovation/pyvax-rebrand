import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pyvax-admin-2026';

function checkBasicAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Basic ')) return false;
  try {
    const decoded = atob(auth.slice(6));
    const [user, pass] = decoded.split(':');
    return user === ADMIN_USER && pass === ADMIN_PASSWORD;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // ── Admin Basic Auth ────────────────────────────────────────────────
  if (url.pathname.startsWith('/admin')) {
    if (!checkBasicAuth(req)) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="PyVax Admin"' },
      });
    }
  }
  
  // Get hostname (e.g., 'classified.pyvax.xyz' or 'localhost:3000')
  const hostname = req.headers.get('host') || '';
  const forwardedHost = req.headers.get('x-forwarded-host') || '';
  
  // Check if the current hostname is the classified subdomain
  // Vercel often uses x-forwarded-host for the original request domain
  const isClassified = hostname.includes('classified.pyvax.xyz') || forwardedHost.includes('classified.pyvax.xyz');
  const isCareers = hostname.includes('careers.pyvax.xyz') || forwardedHost.includes('careers.pyvax.xyz');

  if (isClassified) {
    // If we're at the root of the subdomain
    if (url.pathname === '/') {
      url.pathname = '/classified';
      return NextResponse.rewrite(url);
    }
  }

  if (isCareers) {
    if (url.pathname === '/') {
      url.pathname = '/careers';
      return NextResponse.rewrite(url);
    }
    // Rewrite /test/* to /careers/test/* and /mission/* stays as-is
    if (url.pathname.startsWith('/test/')) {
      url.pathname = `/careers${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  // Match all request paths except for the ones starting with:
  // - api (API routes)
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
