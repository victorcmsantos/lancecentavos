import { api } from '@/lib/api';
import { AuctionList } from '@/components/AuctionList';
import { Auction } from '@/lib/types';

async function getAuctions(): Promise<Auction[]> {
  try {
    const response = await api.get('/auctions?limit=12&offset=0');
    return response.data;
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const auctions = await getAuctions();

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-gradient-to-r from-brand to-emerald-500 p-8 text-white">
        <h1 className="text-3xl font-bold">Real-time Auctions for White-label Brands</h1>
        <p className="mt-2 text-white/90">Multi-tenant, influencer-ready, and built for scale.</p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Live Auctions</h2>
        <AuctionList auctions={auctions} />
      </section>
    </div>
  );
}
