import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { api } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plataforma de Lances',
  description: 'Plataforma white-label de leiloes em tempo real'
};

async function getTenantTheme(subdomain: string) {
  if (!subdomain || subdomain === 'default') {
    return { primary_color: '#0F766E', display_name: 'Plataforma de Lances', logo_url: '' };
  }

  try {
    const response = await api.get(`/tenants/${subdomain}`);
    return response.data;
  } catch {
    return { primary_color: '#0F766E', display_name: 'Plataforma de Lances', logo_url: '' };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = headers();
  const subdomain = requestHeaders.get('x-tenant-subdomain') ?? 'default';
  const theme = await getTenantTheme(subdomain);

  return (
    <html lang="pt-BR">
      <body style={{ ['--brand-color' as string]: theme.primary_color }}>
        <AppShell theme={theme}>{children}</AppShell>
      </body>
    </html>
  );
}
