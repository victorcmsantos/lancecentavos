import Link from 'next/link';
import { Auction } from '@/lib/types';

export function AuctionList({ auctions }: { auctions: Auction[] }) {
  if (!auctions.length) {
    return <p className="text-slate-500">No auctions available.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {auctions.map((auction) => (
        <div key={auction.id} className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">{auction.title}</h3>
          <p className="mt-2 text-sm text-slate-600 line-clamp-2">{auction.description}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm">Current: ${auction.current_price}</span>
            <span className="rounded bg-brand/10 px-2 py-1 text-xs capitalize text-brand">{auction.status}</span>
          </div>
          <Link href={`/auction/${auction.id}`} className="mt-4 inline-block text-sm font-medium text-brand">
            Enter auction
          </Link>
        </div>
      ))}
    </div>
  );
}
