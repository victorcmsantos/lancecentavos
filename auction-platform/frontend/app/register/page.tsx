'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'user' | 'influencer'>('user');
  const [form, setForm] = useState({
    email: '',
    password: '',
    display_name: '',
    subdomain: '',
    logo_url: '',
    primary_color: '#0F766E'
  });
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    try {
      await api.post('/auth/register', { ...form, role });
      router.push('/login');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Registration failed');
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-lg border bg-white p-6">
      <h1 className="text-2xl font-semibold">Register</h1>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <select className="w-full rounded border px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as 'user' | 'influencer')}>
          <option value="user">User</option>
          <option value="influencer">Influencer</option>
        </select>
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        {role === 'influencer' ? (
          <>
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="Display Name"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              required
            />
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="Subdomain (e.g. influencer1)"
              value={form.subdomain}
              onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
              required
            />
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="Logo URL"
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            />
            <input
              className="h-10 w-full rounded border px-1"
              type="color"
              value={form.primary_color}
              onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
            />
          </>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="w-full rounded bg-brand px-4 py-2 text-white" type="submit">
          Create Account
        </button>
      </form>
    </div>
  );
}
