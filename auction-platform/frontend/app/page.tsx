import { api } from '@/lib/api';
import Link from 'next/link';
import { headers } from 'next/headers';
import { Tenant } from '@/lib/types';

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

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-gradient-to-r from-brand to-emerald-500 p-8 text-white">
        <h1 className="text-3xl font-bold">Escolha um Influenciador</h1>
        <p className="mt-2 text-white/90">Abra a pagina do influenciador para ver seus leiloes e lances.</p>
      </section>

      <section id="influencers">
        <h2 className="mb-4 text-2xl font-semibold">Influenciadores</h2>
        {!resolvedInfluencers.length ? <p className="text-slate-500">Nenhum influenciador cadastrado ainda.</p> : null}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resolvedInfluencers.map((influencer) => (
            <Link key={influencer.id} href={`/influencer/${influencer.subdomain}`} className="rounded-lg border bg-white p-4 shadow-sm hover:border-brand">
              <div className="flex items-center gap-3">
                {influencer.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={influencer.logo_url} alt={influencer.display_name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full" style={{ backgroundColor: influencer.primary_color || '#0F766E' }} />
                )}
                <div>
                  <h3 className="font-semibold">{influencer.display_name}</h3>
                  <p className="text-sm text-slate-500">@{influencer.subdomain}</p>
                </div>
              </div>
              <span className="mt-4 inline-block text-sm font-medium text-brand">Ver Produtos e Lances</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
