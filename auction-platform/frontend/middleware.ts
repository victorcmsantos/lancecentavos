import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const hostname = host.split(':')[0];
  const normalizedHost = hostname.toLowerCase();
  const segments = normalizedHost.split('.');

  let subdomain = 'default';
  const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(normalizedHost);
  const isIPv6 = normalizedHost.includes(':');
  const isLoopback = normalizedHost === 'localhost' || isIPv4 || isIPv6;
  const isLocalhostFamily = normalizedHost.endsWith('.localhost');
  const hasTenantSegmentOnPublicHost = segments.length >= 4;

  if (isLocalhostFamily && segments.length >= 2) {
    subdomain = segments[0];
  } else if (!isLoopback && hasTenantSegmentOnPublicHost) {
    subdomain = segments[0];
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-subdomain', subdomain);

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
