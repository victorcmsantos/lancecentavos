'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { clearToken, setAuthSession } from '@/lib/auth';

function apiErrorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.error;
  const status = err?.response?.status;
  if (typeof message === 'string' && message.trim() !== '') {
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const role = response?.data?.user?.role;
      if (role !== 'user') {
        clearToken();
        setError('Este login e apenas para usuarios comuns. Influenciadores devem usar /influencer.');
        return;
      }
      setAuthSession(response.data.token, response.data.user);
      router.push('/');
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Falha no login'));
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border bg-white p-6">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <input className="w-full rounded border px-3 py-2" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="w-full rounded bg-brand px-4 py-2 text-white" type="submit">
          Entrar
        </button>
        <Link href="/register" className="block text-center text-sm font-medium text-brand">
          Criar conta
        </Link>
      </form>
    </div>
  );
}
