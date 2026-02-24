'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { api, authHeaders } from '@/lib/api';
import { getCurrentUser, getToken, getTokenRole } from '@/lib/auth';
import { Auction } from '@/lib/types';

export default function CreateBidPage() {
  const [auctionID, setAuctionID] = useState('');
  const [message, setMessage] = useState('');
  const [auctions, setAuctions] = useState<Auction[]>([]);

  useEffect(() => {
    async function loadAuctions() {
      const user = getCurrentUser();
      if (!user?.id) return;

      try {
        const response = await api.get(`/auctions?limit=50&offset=0&influencer_id=${user.id}`);
        setAuctions(response.data);
      } catch {
        setAuctions([]);
      }
    }

    loadAuctions();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage('');

    const token = getToken();
    if (!token || getTokenRole() !== 'influencer') {
      setMessage('Faca login como influenciador primeiro');
      return;
    }
    if (!auctionID) {
      setMessage('Selecione primeiro um leilao de produto');
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
      setMessage('Lance criado com sucesso (+$0.01)');
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? 'Falha ao criar lance');
    }
  }

  if (!getToken() || getTokenRole() !== 'influencer') {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6">
        <h1 className="text-2xl font-semibold">Criar Lance</h1>
        <p className="mt-2 text-slate-600">Voce precisa estar autenticado como influenciador para criar lances.</p>
        <Link href="/influencer" className="mt-4 inline-block rounded bg-brand px-4 py-2 text-white">
          Ir para Login/Cadastro de Influenciador
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-lg border bg-white p-6">
      <h1 className="text-2xl font-semibold">Criar Lance</h1>
      {!auctions.length ? (
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Nenhum leilao de produto encontrado. Crie um primeiro.
          <Link href="/influencer/create-auction" className="ml-2 font-semibold underline">
            Criar Produto
          </Link>
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <select className="w-full rounded border px-3 py-2" value={auctionID} onChange={(e) => setAuctionID(e.target.value)} required>
          <option value="">Selecione o Leilao de Produto</option>
          {auctions.map((auction) => (
            <option key={auction.id} value={auction.id}>
              {auction.title} ({auction.id.slice(0, 8)})
            </option>
          ))}
        </select>
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        <button className="rounded bg-brand px-4 py-2 text-white" type="submit">
          Enviar Lance +$0.01
        </button>
      </form>
    </div>
  );
}
