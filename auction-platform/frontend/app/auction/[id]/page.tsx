import { api } from '@/lib/api';
import { Auction, Bid } from '@/lib/types';
import { Countdown } from '@/components/Countdown';
import { BidPanel } from '@/components/BidPanel';
import { BidHistory } from '@/components/BidHistory';

async function getAuction(id: string): Promise<Auction | null> {
  try {
    const response = await api.get(`/auctions/${id}`);
    return response.data;
  } catch {
    return null;
  }
}

async function getBids(id: string): Promise<Bid[]> {
  try {
    const response = await api.get(`/auctions/${id}/bids?limit=50`);
    return response.data;
  } catch {
    return [];
  }
}

export default async function AuctionPage({ params }: { params: { id: string } }) {
  const [auction, bids] = await Promise.all([getAuction(params.id), getBids(params.id)]);

  if (!auction) {
    return <p>Auction not found.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4">
        <div className="rounded-lg border bg-white p-4">
          <h1 className="text-2xl font-semibold">{auction.title}</h1>
          <p className="mt-2 text-slate-600">{auction.description}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm">Current Price</span>
            <span className="text-2xl font-bold text-brand">${auction.current_price}</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm">Countdown</span>
            <Countdown endTime={auction.end_time} serverTimeUnix={auction.server_time_unix} />
          </div>
        </div>

        <BidPanel auctionID={auction.id} initialBids={bids} />
      </section>

      <section>
        <BidHistory bids={bids} />
      </section>
    </div>
  );
}
