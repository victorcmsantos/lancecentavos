'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getCurrentUser, getToken, setAuthSession } from '@/lib/auth';

type PackageOption = {
  id: 'starter' | 'standard' | 'pro';
  label: string;
  bids: number;
  price: string;
};

const PACKAGES: PackageOption[] = [
  { id: 'starter', label: 'Starter', bids: 20, price: 'R$ 20,00' },
  { id: 'standard', label: 'Standard', bids: 60, price: 'R$ 45,00' },
  { id: 'pro', label: 'Pro', bids: 120, price: 'R$ 60,00' }
];

export default function BidPackagesPage() {
  function syncCreditsUI(nextCredits: number, userPayload?: any) {
    const token = getToken();
    if (!token) return;
    const currentUser = getCurrentUser();
    const mergedUser = {
      ...(currentUser ?? {}),
      ...(userPayload ?? {}),
      bid_credits: nextCredits
    };
    setAuthSession(token, mergedUser);
    window.dispatchEvent(new CustomEvent('user:bid-credits-updated', { detail: { bidCredits: nextCredits } }));
  }

  const [credits, setCredits] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [loadingPackage, setLoadingPackage] = useState<string>('');

  useEffect(() => {
    const token = getToken();
    const authToken = token ?? '';
    const user = getCurrentUser();
    if (typeof user?.bid_credits === 'number') {
      setCredits(user.bid_credits);
    }
    if (!token) return;

    let active = true;
    async function loadMe() {
      try {
        const response = await api.get('/users/me', { headers: { Authorization: `Bearer ${authToken}` } });
        if (!active) return;
        const me = response.data;
        const nextCredits = typeof me?.bid_credits === 'number' ? me.bid_credits : 0;
        setCredits(nextCredits);
        syncCreditsUI(nextCredits, me);
      } catch {
        // keep current state
      }
    }

    void loadMe();
    return () => {
      active = false;
    };
  }, []);

  async function handleBuy(packageID: PackageOption['id']) {
    setMessage('');
    const token = getToken();
    if (!token) {
      setMessage('Faca login para comprar pacotes.');
      return;
    }

    setLoadingPackage(packageID);
    try {
      const response = await api.post(
        '/users/me/bid-packages',
        { package_id: packageID },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const me = response.data;
      const nextCredits = typeof me?.bid_credits === 'number' ? me.bid_credits : credits;
      setCredits(nextCredits);
      syncCreditsUI(nextCredits, me);
      setMessage('Pacote comprado com sucesso.');
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? 'Falha ao comprar pacote.');
    } finally {
      setLoadingPackage('');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-lg border bg-white p-5">
        <h1 className="text-2xl font-semibold">Pacotes de Lances</h1>
        <p className="mt-2 text-sm text-slate-600">Saldo atual: {credits} lances</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PACKAGES.map((pack) => (
          <div key={pack.id} className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold">{pack.label}</h2>
            <p className="mt-2 text-sm text-slate-600">{pack.bids} lances</p>
            <p className="text-sm text-slate-600">{pack.price}</p>
            <button
              className="mt-4 rounded bg-brand px-4 py-2 text-white disabled:opacity-60"
              type="button"
              disabled={loadingPackage === pack.id}
              onClick={() => handleBuy(pack.id)}
            >
              {loadingPackage === pack.id ? 'Processando...' : 'Comprar'}
            </button>
          </div>
        ))}
      </section>

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}
