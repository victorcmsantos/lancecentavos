'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    try {
      await api.post('/auth/register', { ...form, role: 'user' });
      router.push('/login');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Falha no cadastro');
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-lg border bg-white p-6">
      <h1 className="text-2xl font-semibold">Cadastro</h1>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="E-mail"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Senha"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="w-full rounded bg-brand px-4 py-2 text-white" type="submit">
          Criar Conta
        </button>
      </form>
    </div>
  );
}
