import { headers } from 'next/headers';
import { api } from '@/lib/api';
import { Tenant } from '@/lib/types';
import { LandingPageContent } from '@/components/LandingPageContent';

async function getInfluencers(): Promise<Tenant[]> {
  try {
    const response = await api.get('/tenants?limit=24&offset=0');
    return response.data;
  } catch {
    return [];
  }
}

async function getInfluencerBySubdomain(subdomain: string): Promise<Tenant | null> {
  try {
    const response = await api.get(`/tenants/${subdomain}`);
    return response.data;
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const requestHeaders = headers();
  const subdomain = (requestHeaders.get('x-tenant-subdomain') ?? 'default').toLowerCase();

  let resolvedInfluencers: Tenant[] = [];
  if (subdomain && subdomain !== 'default') {
    const influencer = await getInfluencerBySubdomain(subdomain);
    resolvedInfluencers = influencer ? [influencer] : [];
  } else {
    resolvedInfluencers = await getInfluencers();
  }

  const isDedicatedTenantView = Boolean(subdomain && subdomain !== 'default');
  const heroTitle = isDedicatedTenantView
    ? `Entre nos leiloes de ${resolvedInfluencers[0]?.display_name ?? 'um influenciador'}`
    : 'Escolha uma vitrine, acompanhe o ritmo e entre no lance certo';
  const heroDescription = isDedicatedTenantView
    ? 'Esta pagina ja filtra a jornada para uma unica marca. Veja os produtos ativos e abra a sala de lance com menos cliques.'
    : 'A plataforma agora organiza melhor a descoberta de influenciadores, a entrada nas salas e a compra de creditos para reduzir friccao.';

  return (
    <LandingPageContent
      resolvedInfluencers={resolvedInfluencers}
      isDedicatedTenantView={isDedicatedTenantView}
      heroTitle={heroTitle}
      heroDescription={heroDescription}
    />
  );
}
