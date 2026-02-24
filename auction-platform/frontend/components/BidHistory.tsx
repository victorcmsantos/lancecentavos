'use client';

import { useEffect, useState } from 'react';
import { Bid } from '@/lib/types';
import { formatCents } from '@/lib/money';

type BidUpdateEvent = CustomEvent<{
  auctionId?: string;
  bid?: Bid;
}>;

export function BidHistory({ auctionID, bids }: { auctionID: string; bids: Bid[] }) {
  const [liveBids, setLiveBids] = useState<Bid[]>(bids.slice(0, 10));

  useEffect(() => {
    setLiveBids(bids.slice(0, 10));
  }, [bids]);

  useEffect(() => {
    const handleBidUpdate = (event: Event) => {
      const custom = event as BidUpdateEvent;
      if (custom.detail?.auctionId !== auctionID || !custom.detail?.bid) return;

      const incoming = custom.detail.bid;
      setLiveBids((current) => [incoming, ...current.filter((bid) => bid.id !== incoming.id)].slice(0, 10));
    };

    window.addEventListener('auction:bid-update', handleBidUpdate);
    return () => window.removeEventListener('auction:bid-update', handleBidUpdate);
  }, [auctionID]);

  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold">Historico de Lances</h2>
      <div className="space-y-2">
        {liveBids.map((bid) => (
          <div key={bid.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span className="font-mono">{bid.user_id.slice(0, 8)}</span>
            <span className="font-semibold">{formatCents(bid.amount)}</span>
            <span className="text-slate-500">{new Date(bid.created_at).toLocaleTimeString('pt-BR')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
