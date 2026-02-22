'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, authHeaders } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Bid } from '@/lib/types';

type BidUpdate = {
  auction_id: string;
  bid_id: string;
  user_id: string;
  amount: number;
  created_at: string;
};

export function BidPanel({ auctionID, initialBids }: { auctionID: string; initialBids: Bid[] }) {
  const [bids, setBids] = useState<Bid[]>(initialBids);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const wsURL = useMemo(() => {
    const token = getToken();
    if (!token) return '';
    return `${process.env.NEXT_PUBLIC_WS_URL}/ws/auctions/${auctionID}?token=${token}`;
  }, [auctionID]);

  useEffect(() => {
    if (!wsURL) return;
    const ws = new WebSocket(wsURL);

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as BidUpdate | { type: 'error'; error: string };
      if ('type' in payload && payload.type === 'error') {
        setError(payload.error);
        return;
      }
      const incoming = payload as BidUpdate;
      setBids((current) => [
        {
          id: incoming.bid_id,
          auction_id: incoming.auction_id,
          user_id: incoming.user_id,
          amount: incoming.amount,
          created_at: incoming.created_at,
          received_at: incoming.created_at
        },
        ...current
      ]);
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
    };

    return () => ws.close();
  }, [wsURL]);

  async function handleBid(event: FormEvent) {
    event.preventDefault();
    setError('');

    const token = getToken();
    if (!token) {
      setError('Please login first');
      return;
    }

    try {
      await api.post(
        `/auctions/${auctionID}/bids`,
        {
          amount: Number(amount),
          client_timestamp: Math.floor(Date.now() / 1000)
        },
        {
          headers: authHeaders(token)
        }
      );
      setAmount('');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to place bid');
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleBid} className="rounded-lg border bg-white p-4">
        <label className="block text-sm font-medium">Your bid</label>
        <div className="mt-2 flex gap-2">
          <input
            className="w-full rounded border px-3 py-2"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <button className="rounded bg-brand px-4 py-2 text-white" type="submit">
            Place Bid
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </form>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Live Feed</h2>
        <div className="space-y-2">
          {bids.map((bid) => (
            <div key={bid.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <span className="font-mono">{bid.user_id.slice(0, 8)}</span>
              <span className="font-semibold">${bid.amount}</span>
              <span>{new Date(bid.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
