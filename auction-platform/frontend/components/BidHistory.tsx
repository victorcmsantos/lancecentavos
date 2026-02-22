import { Bid } from '@/lib/types';

export function BidHistory({ bids }: { bids: Bid[] }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold">Bid History</h2>
      <div className="space-y-2">
        {bids.map((bid) => (
          <div key={bid.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span className="font-mono">{bid.user_id.slice(0, 8)}</span>
            <span className="font-semibold">${bid.amount}</span>
            <span className="text-slate-500">{new Date(bid.created_at).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
