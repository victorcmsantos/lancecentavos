import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { api } from '@/lib/api';
import './globals.css';

export const metadata: Metadata = {
  title: 'Auction Platform',
  description: 'Real-time white-label auction platform starter'
};

async function getTenantTheme(subdomain: string) {
  if (!subdomain || subdomain === 'default') {
    return { primary_color: '#0F766E', display_name: 'Auction Platform', logo_url: '' };
  }

  try {
    const response = await api.get(`/tenants/${subdomain}`);
    return response.data;
  } catch {
    return { primary_color: '#0F766E', display_name: 'Auction Platform', logo_url: '' };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = headers();
  const subdomain = requestHeaders.get('x-tenant-subdomain') ?? 'default';
  const theme = await getTenantTheme(subdomain);

  return (
    <html lang="en">
      <body style={{ ['--brand-color' as string]: theme.primary_color }}>
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {theme.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={theme.logo_url} alt="logo" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-brand" />
              )}
              <span className="font-semibold">{theme.display_name}</span>
            </div>
            <nav className="flex gap-4 text-sm">
              <a href="/">Home</a>
              <a href="/dashboard">Dashboard</a>
              <a href="/influencer/dashboard">Influencer</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
