import Link from 'next/link';
import { api } from '@/lib/api';
import { Auction, Bid, Tenant } from '@/lib/types';
import { formatCents } from '@/lib/money';
import { traduzirStatusLeilao } from '@/lib/i18n';
import { ImageCarousel } from '@/components/ImageCarousel';

async function getInfluencer(subdomain: string): Promise<Tenant | null> {
  try {
    const response = await api.get(`/tenants/${subdomain}`);
    return response.data;
  } catch {
    return null;
  }
}

async function getAuctionsByInfluencer(influencerUserID: string): Promise<Auction[]> {
  try {
    const response = await api.get(`/auctions?limit=20&offset=0&influencer_id=${influencerUserID}`);
    return response.data;
  } catch {
    return [];
  }
}

async function getBidsByAuctionID(auctionID: string): Promise<Bid[]> {
  try {
    const response = await api.get(`/auctions/${auctionID}/bids?limit=5`);
    return response.data;
  } catch {
    return [];
  }
}

export default async function InfluencerPage({ params }: { params: { subdomain: string } }) {
  const influencer = await getInfluencer(params.subdomain);

  if (!influencer) {
    return <p>Influenciador nao encontrado.</p>;
  }

  const auctions = await getAuctionsByInfluencer(influencer.user_id);
  const bidsByAuctionEntries = await Promise.all(auctions.map(async (auction) => [auction.id, await getBidsByAuctionID(auction.id)] as const));
  const bidsByAuction = new Map<string, Bid[]>(bidsByAuctionEntries);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-center gap-3">
          {influencer.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={influencer.logo_url} alt={influencer.display_name} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-full" style={{ backgroundColor: influencer.primary_color || '#0F766E' }} />
          )}
          <div>
            <h1 className="text-2xl font-semibold">{influencer.display_name}</h1>
            <p className="text-sm text-slate-500">@{influencer.subdomain}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Produtos e Lances</h2>
        {!auctions.length ? <p className="text-slate-500">Nenhum leilao encontrado para este influenciador.</p> : null}
        <div className="space-y-4">
          {auctions.map((auction) => {
            const bids = bidsByAuction.get(auction.id) ?? [];
            return (
              <div key={auction.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{auction.title}</h3>
                  <span className="rounded bg-brand/10 px-2 py-1 text-xs capitalize text-brand">{traduzirStatusLeilao(auction.status)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{auction.description}</p>
                <ImageCarousel images={auction.image_urls ?? []} title={auction.title} />
                <div className="mt-2 text-sm">
                  <span className="font-medium">Preco atual:</span> {formatCents(auction.current_price)}
                </div>
                <div className="mt-3">
                  <h4 className="text-sm font-medium">Lances recentes</h4>
                  {!bids.length ? <p className="mt-1 text-sm text-slate-500">Sem lances ainda.</p> : null}
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {bids.map((bid) => (
                      <li key={bid.id}>
                        {formatCents(bid.amount)} em {new Date(bid.created_at).toLocaleString('pt-BR')}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href={`/auction/${auction.id}`} className="mt-4 inline-block text-sm font-medium text-brand">
                  Abrir sala do leilao
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
