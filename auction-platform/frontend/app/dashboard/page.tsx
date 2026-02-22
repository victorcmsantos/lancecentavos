import Link from 'next/link';
import { api } from '@/lib/api';
import { Auction } from '@/lib/types';

async function getAuctions(): Promise<Auction[]> {
  try {
    const response = await api.get('/auctions?limit=20&offset=0');
    return response.data;
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const auctions = await getAuctions();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm text-slate-600">Browse and join active auctions.</p>
      </div>
      <div className="grid gap-3">
        {auctions.map((auction) => (
          <Link key={auction.id} href={`/auction/${auction.id}`} className="rounded-lg border bg-white p-4 hover:border-brand">
            <div className="flex justify-between">
              <span className="font-medium">{auction.title}</span>
              <span className="text-sm">${auction.current_price}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
