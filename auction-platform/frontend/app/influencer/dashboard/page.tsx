'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { api, authHeaders } from '@/lib/api';
import { clearToken, getCurrentUser, getToken, getTokenRole, setAuthSession } from '@/lib/auth';
import { Auction } from '@/lib/types';
import { traduzirStatusLeilao } from '@/lib/i18n';
import { parseReaisToCents } from '@/lib/money';
import { filesToDataURLs, MAX_IMAGE_COUNT, MAX_IMAGE_SIZE_BYTES } from '@/lib/images';
import { ImageCarousel } from '@/components/ImageCarousel';

type Mode = 'login' | 'register';

function apiErrorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.error;
  const status = err?.response?.status;
  if (typeof message === 'string' && message.trim() !== '') {
    if (message.toLowerCase().includes('duplicate key')) {
      return 'E-mail ou subdominio ja existe. Tente outro ou faca login.';
    }
    return message;
  }
  if (err?.code === 'ERR_NETWORK') {
    return 'Nao foi possivel acessar a API. Verifique se o backend esta rodando e o CORS configurado.';
  }
  if (typeof status === 'number') {
    return `${fallback} (HTTP ${status})`;
  }
  if (typeof err?.message === 'string' && err.message.trim() !== '') {
    return `${fallback}: ${err.message}`;
  }
  return fallback;
}

export default function InfluencerDashboardPage() {
  function formatCurrencyFromCents(value: number): string {
    return `R$ ${(value / 100).toFixed(2)}`;
  }

  function formatDate(value?: string): string {
    if (!value) return '-';
    return new Date(value).toLocaleString('pt-BR');
  }

  const [mode, setMode] = useState<Mode>('login');
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [createAuctionForm, setCreateAuctionForm] = useState({
    title: '',
    description: '',
    productValue: '',
    countdownSec: '3600',
    startTime: '',
    imageURLs: [] as string[]
  });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    display_name: '',
    subdomain: '',
    logo_url: '',
    primary_color: '#0F766E'
  });
  const currentUser = getCurrentUser();
  const isInfluencerApproved = currentUser?.role === 'influencer' ? currentUser?.is_approved !== false : false;

  useEffect(() => {
    setAuthRole(getTokenRole());
    setIsReady(true);
  }, []);

  useEffect(() => {
    async function loadAuctions() {
      const token = getToken();
      const role = getTokenRole();
      const user = getCurrentUser();
      if (!token || role !== 'influencer' || !user?.id) {
        setAuctions([]);
        return;
      }
      try {
        const response = await api.get(`/auctions?limit=50&offset=0&influencer_id=${user.id}`, { headers: authHeaders(token) });
        setAuctions(response.data);
      } catch {
        setAuctions([]);
      }
    }
    void loadAuctions();
  }, [authRole]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await api.post('/auth/login', loginForm);
      const role = response?.data?.user?.role as string | undefined;
      if (role !== 'influencer') {
        clearToken();
        setError('Esta conta nao e de influenciador.');
        return;
      }

      setAuthSession(response.data.token, response.data.user);
      setAuthRole('influencer');
      if (response?.data?.user?.is_approved === false) {
        setMessage('Conta autenticada. Aguarde aprovacao do admin para criar produtos.');
      } else {
        setMessage('Autenticado com sucesso.');
      }
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Falha no login'));
    }
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await api.post('/auth/register', { ...registerForm, role: 'influencer' });
      const response = await api.post('/auth/login', {
        email: registerForm.email,
        password: registerForm.password
      });
      setAuthSession(response.data.token, response.data.user);
      setAuthRole('influencer');
      setMessage('Conta criada. Aguarde aprovacao do admin para criar produtos.');
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Falha no cadastro'));
    }
  }

  function handleLogout() {
    clearToken();
    setAuthRole(null);
    setMessage('');
    setError('');
  }

  async function handleImageSelection(files: FileList | null) {
    if (!files?.length) {
      setCreateAuctionForm((prev) => ({ ...prev, imageURLs: [] }));
      return;
    }
    const { images, errors } = await filesToDataURLs(files);
    setCreateAuctionForm((prev) => ({ ...prev, imageURLs: images }));
    if (errors.length) {
      setError(errors.join(' '));
    }
  }

  async function handleCreateAuction(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    const token = getToken();
    const role = getTokenRole();
    if (!token || role !== 'influencer') {
      setError('Faca login como influenciador primeiro');
      return;
    }

    const productValueInCents = parseReaisToCents(createAuctionForm.productValue);
    if (productValueInCents === null) {
      setError('Informe um valor do produto valido em reais. Ex.: 199,90');
      return;
    }

    try {
      await api.post(
        '/auctions',
        {
          title: createAuctionForm.title,
          description: createAuctionForm.description,
          image_urls: createAuctionForm.imageURLs,
          product_value: productValueInCents,
          start_price: 1,
          countdown_seconds: Number(createAuctionForm.countdownSec),
          start_time: createAuctionForm.startTime ? new Date(createAuctionForm.startTime).toISOString() : null
        },
        { headers: authHeaders(token) }
      );
      setMessage('Leilao criado com sucesso');
      setCreateAuctionForm({
        title: '',
        description: '',
        productValue: '',
        countdownSec: '3600',
        startTime: '',
        imageURLs: []
      });

      const user = getCurrentUser();
      if (user?.id) {
        const response = await api.get(`/auctions?limit=50&offset=0&influencer_id=${user.id}`, { headers: authHeaders(token) });
        setAuctions(response.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Falha ao criar leilao');
    }
  }

  if (!isReady) {
    return null;
  }

  if (authRole === 'influencer') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Painel do Influenciador</h1>
        <div className="rounded-lg border bg-white p-4">
          <div className="mt-3 flex flex-wrap gap-3">
            {isInfluencerApproved ? (
              <button
                className="rounded bg-brand px-4 py-2 text-white"
                type="button"
                onClick={() => document.getElementById('criar-produto-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Criar Produto
              </button>
            ) : null}
            <button className="rounded border px-4 py-2 text-slate-700" type="button" onClick={handleLogout}>
              Sair
            </button>
          </div>
          {!isInfluencerApproved ? <p className="mt-4 text-sm text-amber-700">Conta pendente de aprovacao do admin.</p> : null}
          {isInfluencerApproved ? (
            <form id="criar-produto-form" onSubmit={handleCreateAuction} className="mt-4 space-y-3 rounded border p-3">
              <h2 className="text-sm font-semibold text-slate-700">Criar Produto</h2>
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="Titulo"
              value={createAuctionForm.title}
              onChange={(e) => setCreateAuctionForm({ ...createAuctionForm, title: e.target.value })}
              required
            />
            <textarea
              className="w-full rounded border px-3 py-2"
              placeholder="Descricao"
              value={createAuctionForm.description}
              onChange={(e) => setCreateAuctionForm({ ...createAuctionForm, description: e.target.value })}
            />
            <div className="space-y-2">
              <input
                className="w-full rounded border px-3 py-2"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => void handleImageSelection(e.target.files)}
              />
              <p className="text-xs text-slate-500">
                Ate {MAX_IMAGE_COUNT} imagens por produto. Tamanho maximo por imagem: {Math.floor(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB.
              </p>
              {createAuctionForm.imageURLs.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {createAuctionForm.imageURLs.map((url, index) => (
                    <div key={`${index}`} className="h-20 overflow-hidden rounded border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <input
              className="w-full rounded border px-3 py-2"
              type="text"
              inputMode="decimal"
              placeholder="Valor do Produto (R$) Ex.: 199,90"
              value={createAuctionForm.productValue}
              onChange={(e) => setCreateAuctionForm({ ...createAuctionForm, productValue: e.target.value })}
              required
            />
            <input
              className="w-full rounded border px-3 py-2"
              type="number"
              min={10}
              placeholder="Contagem Regressiva em Segundos (padrao 3600)"
              value={createAuctionForm.countdownSec}
              onChange={(e) => setCreateAuctionForm({ ...createAuctionForm, countdownSec: e.target.value })}
              required
            />
            <input
              className="w-full rounded border px-3 py-2"
              type="datetime-local"
              value={createAuctionForm.startTime}
              onChange={(e) => setCreateAuctionForm({ ...createAuctionForm, startTime: e.target.value })}
              required
            />
            <button className="rounded bg-brand px-4 py-2 text-white" type="submit">
              Salvar
            </button>
            </form>
          ) : null}
          {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h2 className="text-lg font-semibold">Seus Produtos</h2>
          {!auctions.length ? <p className="mt-2 text-sm text-slate-600">Nenhum produto ainda.</p> : null}
          <div className="mt-3 space-y-2">
            {auctions.map((auction) => (
              <Link key={auction.id} href={`/auction/${auction.id}`} className="block rounded border p-3 hover:border-brand">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="w-full">
                    <p className="font-medium">{auction.title}</p>
                    <ImageCarousel images={auction.image_urls ?? []} title={auction.title} />
                    <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-5">
                      <div className="flex items-center justify-between rounded border px-2 py-1">
                        <span>Status</span>
                        <span className="font-medium text-slate-300">{traduzirStatusLeilao(auction.status)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded border px-2 py-1">
                        <span>Valor</span>
                        <span className="font-medium text-slate-300">{formatCurrencyFromCents(auction.product_value)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded border px-2 py-1">
                        <span>Preco Atual</span>
                        <span className="font-medium text-slate-300">{formatCurrencyFromCents(auction.current_price)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded border px-2 py-1">
                        <span>Repasse</span>
                        <span className="font-medium text-slate-300">{formatCurrencyFromCents(auction.influencer_transfer)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded border px-2 py-1">
                        <span>Inicio</span>
                        <span className="font-medium text-slate-300">{formatDate(auction.start_time)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded border px-2 py-1 sm:col-span-2 xl:col-span-5">
                        <span>Fim</span>
                        <span className="font-medium text-slate-300">{formatDate(auction.end_time)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-lg border bg-white p-6">
      <h1 className="text-2xl font-semibold">Acesso do Influenciador</h1>
      <p className="mt-2 text-slate-600">Autentique-se ou cadastre-se como influenciador para acessar esta area.</p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`rounded px-4 py-2 ${mode === 'login' ? 'bg-brand text-white' : 'border text-slate-700'}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`rounded px-4 py-2 ${mode === 'register' ? 'bg-brand text-white' : 'border text-slate-700'}`}
        >
          Cadastrar Influenciador
        </button>
      </div>

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="mt-4 space-y-4">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="E-mail"
            type="email"
            value={loginForm.email}
            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Senha"
            type="password"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            required
          />
          <button className="rounded bg-brand px-4 py-2 text-white" type="submit">
            Entrar como Influenciador
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="mt-4 space-y-4">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="E-mail"
            type="email"
            value={registerForm.email}
            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Senha"
            type="password"
            minLength={8}
            value={registerForm.password}
            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Nome de Exibicao"
            value={registerForm.display_name}
            onChange={(e) => setRegisterForm({ ...registerForm, display_name: e.target.value })}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Subdominio (ex: influencer1)"
            value={registerForm.subdomain}
            onChange={(e) => setRegisterForm({ ...registerForm, subdomain: e.target.value })}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="URL do Logo"
            value={registerForm.logo_url}
            onChange={(e) => setRegisterForm({ ...registerForm, logo_url: e.target.value })}
          />
          <input
            className="h-10 w-full rounded border px-1"
            type="color"
            value={registerForm.primary_color}
            onChange={(e) => setRegisterForm({ ...registerForm, primary_color: e.target.value })}
          />
          <button className="rounded bg-brand px-4 py-2 text-white" type="submit">
            Criar Conta de Influenciador
          </button>
        </form>
      )}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-green-700">{message}</p> : null}
    </div>
  );
}
