'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { api, authHeaders } from '@/lib/api';
import { getCurrentUser, getToken, getTokenRole } from '@/lib/auth';
import { parseReaisToCents } from '@/lib/money';
import { filesToDataURLs, MAX_IMAGE_COUNT, MAX_IMAGE_SIZE_BYTES } from '@/lib/images';

export default function CreateAuctionPage() {
  const influencerApproved = getCurrentUser()?.is_approved !== false;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productValue, setProductValue] = useState('');
  const [countdownSec, setCountdownSec] = useState('3600');
  const [startTime, setStartTime] = useState('');
  const [imageURLs, setImageURLs] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  async function handleImageSelection(files: FileList | null) {
    if (!files?.length) {
      setImageURLs([]);
      return;
    }
    const { images, errors } = await filesToDataURLs(files);
    setImageURLs(images);
    if (errors.length) {
      setMessage(errors.join(' '));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage('');

    const token = getToken();
    if (!token || getTokenRole() !== 'influencer') {
      setMessage('Faca login como influenciador primeiro');
      return;
    }
    if (!influencerApproved) {
      setMessage('Conta pendente de aprovacao do admin.');
      return;
    }

    const productValueInCents = parseReaisToCents(productValue);
    if (productValueInCents === null) {
      setMessage('Informe um valor do produto valido em reais. Ex.: 199,90');
      return;
    }

    try {
      await api.post(
        '/auctions',
        {
          title,
          description,
          image_urls: imageURLs,
          product_value: productValueInCents,
          start_price: 1,
          countdown_seconds: Number(countdownSec),
          start_time: startTime ? new Date(startTime).toISOString() : null
        },
        {
          headers: authHeaders(token)
        }
      );
      setMessage('Leilao criado com sucesso');
      setTitle('');
      setDescription('');
      setProductValue('');
      setCountdownSec('3600');
      setStartTime('');
      setImageURLs([]);
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? 'Falha ao criar leilao');
    }
  }

  if (!getToken() || getTokenRole() !== 'influencer') {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6">
        <h1 className="text-2xl font-semibold">Criar Leilao</h1>
        <p className="mt-2 text-slate-600">Voce precisa estar autenticado como influenciador para criar leiloes.</p>
        <Link href="/influencer" className="mt-4 inline-block rounded bg-brand px-4 py-2 text-white">
          Ir para Login/Cadastro de Influenciador
        </Link>
      </div>
    );
  }
  if (!influencerApproved) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6">
        <h1 className="text-2xl font-semibold">Criar Produto</h1>
        <p className="mt-2 text-slate-600">Conta pendente de aprovacao do admin. Voce ainda nao pode criar produtos.</p>
        <Link href="/influencer" className="mt-4 inline-block rounded bg-brand px-4 py-2 text-white">
          Voltar ao Painel do Influenciador
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-lg border bg-white p-6">
      <h1 className="text-2xl font-semibold">Criar Leilao</h1>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <input className="w-full rounded border px-3 py-2" placeholder="Titulo" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea
          className="w-full rounded border px-3 py-2"
          placeholder="Descricao"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="space-y-2">
          <input className="w-full rounded border px-3 py-2" type="file" accept="image/*" multiple onChange={(e) => void handleImageSelection(e.target.files)} />
          <p className="text-xs text-slate-500">
            Ate {MAX_IMAGE_COUNT} imagens por produto. Tamanho maximo por imagem: {Math.floor(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB.
          </p>
          {imageURLs.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {imageURLs.map((url, index) => (
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
          value={productValue}
          onChange={(e) => setProductValue(e.target.value)}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="number"
          min={10}
          placeholder="Contagem Regressiva em Segundos (padrao 3600)"
          value={countdownSec}
          onChange={(e) => setCountdownSec(e.target.value)}
          required
        />
        <input className="w-full rounded border px-3 py-2" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        <button className="rounded bg-brand px-4 py-2 text-white" type="submit">
          Salvar
        </button>
      </form>
    </div>
  );
}
