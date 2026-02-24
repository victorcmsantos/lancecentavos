'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, authHeaders } from '@/lib/api';
import { getCurrentUser, getToken, getTokenRole, setAuthSession } from '@/lib/auth';
import { Bid } from '@/lib/types';
import { formatCents } from '@/lib/money';

type BidUpdate = {
  auction_id: string;
  bid_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  end_time?: string;
  server_time_unix?: number;
};

function resolveWsBaseURL(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL;
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.hostname}:8080`;
  }

  return '';
}

export function BidPanel({
  auctionID,
  initialBids,
  initialCurrentPrice,
  auctionStatus
}: {
  auctionID: string;
  initialBids: Bid[];
  initialCurrentPrice: number;
  auctionStatus: 'draft' | 'active' | 'finished';
}) {
  function syncCreditsUI(nextCredits: number, userPayload?: any) {
    const token = getToken();
    if (!token) return;
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const nextUser = { ...currentUser, ...(userPayload ?? {}), bid_credits: nextCredits };
    setAuthSession(token, nextUser);
    window.dispatchEvent(new CustomEvent('user:bid-credits-updated', { detail: { bidCredits: nextCredits } }));
  }

  const router = useRouter();
  const [bids, setBids] = useState<Bid[]>(initialBids);
  const [currentPrice, setCurrentPrice] = useState<number>(initialCurrentPrice);
  const [error, setError] = useState('');
  const [availableCredits, setAvailableCredits] = useState<number | null>(null);
  const [usePollingFallback, setUsePollingFallback] = useState<boolean>(false);

  const wsURL = useMemo(() => {
    const token = getToken();
    if (!token) return '';
    const base = resolveWsBaseURL();
    if (!base) return '';
    return `${base}/ws/auctions/${auctionID}?token=${token}`;
  }, [auctionID]);

  function dispatchBidUpdate(incoming: BidUpdate) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('auction:bid-update', {
        detail: {
          auctionId: incoming.auction_id,
          amount: incoming.amount,
          endTime: incoming.end_time,
          serverTimeUnix: incoming.server_time_unix,
          bid: {
            id: incoming.bid_id,
            auction_id: incoming.auction_id,
            user_id: incoming.user_id,
            amount: incoming.amount,
            created_at: incoming.created_at
          }
        }
      })
    );
  }

  useEffect(() => {
    const token = getToken();
    const authToken = token ?? '';
    const role = getTokenRole();
    if (!token || role !== 'user') {
      setAvailableCredits(null);
      return;
    }

    let active = true;
    async function loadCredits() {
      try {
        const response = await api.get('/users/me', { headers: authHeaders(authToken) });
        if (!active) return;
        const credits = typeof response?.data?.bid_credits === 'number' ? response.data.bid_credits : 0;
        setAvailableCredits(credits);
        syncCreditsUI(credits, response.data);
      } catch {
        if (!active) return;
        setAvailableCredits(null);
      }
    }

    void loadCredits();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!wsURL) {
      setUsePollingFallback(true);
      return;
    }

    let active = true;
    const ws = new WebSocket(wsURL);

    ws.onopen = () => {
      if (!active) return;
      setUsePollingFallback(false);
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as BidUpdate | { type: 'error'; error: string };
      if ('type' in payload && payload.type === 'error') {
        setError(payload.error);
        return;
      }
      const incoming = payload as BidUpdate;
      setBids((current) =>
        [
          {
            id: incoming.bid_id,
            auction_id: incoming.auction_id,
            user_id: incoming.user_id,
            amount: incoming.amount,
            created_at: incoming.created_at,
            received_at: incoming.created_at
          },
          ...current
        ].slice(0, 10)
      );
      setCurrentPrice(incoming.amount);
      dispatchBidUpdate(incoming);
    };

    ws.onerror = () => {
      if (!active) return;
      setUsePollingFallback(true);
    };

    ws.onclose = () => {
      if (!active) return;
      setUsePollingFallback(true);
    };

    return () => {
      active = false;
      ws.close();
    };
  }, [wsURL]);

  useEffect(() => {
    if (!usePollingFallback) return;

    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function syncFromAPI() {
      try {
        const response = await api.get(`/auctions/${auctionID}/bids?limit=10`);
        if (!active) return;
        const nextBids = Array.isArray(response.data) ? (response.data as Bid[]) : [];
        if (!nextBids.length) return;

        setBids((current) => {
          if (current[0]?.id === nextBids[0]?.id) {
            return current;
          }
          return nextBids.slice(0, 10);
        });

        const top = nextBids[0];
        setCurrentPrice(top.amount);
        dispatchBidUpdate({
          auction_id: top.auction_id,
          bid_id: top.id,
          user_id: top.user_id,
          amount: top.amount,
          created_at: top.created_at
        });
      } catch {
        // keep last known state; websocket may still be connected
      }
    }

    void syncFromAPI();
    timer = setInterval(syncFromAPI, 5000);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [auctionID, usePollingFallback]);

  async function handleBid(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (auctionStatus !== 'active') {
      setError('O leilao ainda nao esta ativo.');
      return;
    }

    const token = getToken();
    if (!token) {
      setError('Faca login primeiro');
      return;
    }
    if (typeof availableCredits === 'number' && availableCredits <= 0) {
      router.push('/user/bid-packages');
      return;
    }

    try {
      await api.post(
        `/auctions/${auctionID}/bids`,
        {
          client_timestamp: Math.floor(Date.now() / 1000)
        },
        {
          headers: authHeaders(token)
        }
      );
      if (typeof availableCredits === 'number') {
        const nextCredits = Math.max(0, availableCredits - 1);
        setAvailableCredits(nextCredits);
        syncCreditsUI(nextCredits);
      }

      try {
        const meResponse = await api.get('/users/me', { headers: authHeaders(token) });
        const nextCredits = typeof meResponse?.data?.bid_credits === 'number' ? meResponse.data.bid_credits : availableCredits;
        if (typeof nextCredits === 'number') {
          setAvailableCredits(nextCredits);
          syncCreditsUI(nextCredits, meResponse.data);
        }
      } catch {
        // keep optimistic update
      }
    } catch (err: any) {
      const message = err?.response?.data?.error ?? 'Falha ao enviar lance';
      if (typeof message === 'string' && message.toLowerCase().includes('insufficient bid credits')) {
        setAvailableCredits(0);
        syncCreditsUI(0);
        setError('Voce nao tem lances disponiveis. Compre um pacote para continuar.');
        return;
      }
      setError(message);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleBid} className="rounded-lg border bg-white p-4">
        <label className="block text-sm font-medium">Lance Rapido</label>
        <p className="mt-2 text-sm text-slate-600">Cada lance aumenta o valor do produto em um centavo.</p>
        <button
          className="mt-3 rounded bg-brand px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={auctionStatus !== 'active'}
        >
          Lance!!
        </button>
        {auctionStatus !== 'active' ? <p className="mt-2 text-sm text-slate-500">Os lances abrem quando o influenciador iniciar este leilao.</p> : null}
        {typeof availableCredits === 'number' ? <p className="mt-2 text-sm text-slate-500">Seus lances disponiveis: {availableCredits}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </form>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Feed ao Vivo</h2>
        <div className="space-y-2">
          {bids.map((bid) => (
            <div key={bid.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <span className="font-mono">{bid.user_id.slice(0, 8)}</span>
              <span className="font-semibold">{formatCents(bid.amount)}</span>
              <span>{new Date(bid.created_at).toLocaleTimeString('pt-BR')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
