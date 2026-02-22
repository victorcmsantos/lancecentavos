'use client';

import { FormEvent, useState } from 'react';
import { api, authHeaders } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function CreateAuctionPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startPrice, setStartPrice] = useState('1');
  const [endTime, setEndTime] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage('');

    const token = getToken();
    if (!token) {
      setMessage('Please login as influencer first');
      return;
    }

    try {
      await api.post(
        '/auctions',
        {
          title,
          description,
          start_price: Number(startPrice),
          end_time: endTime ? new Date(endTime).toISOString() : null
        },
        {
          headers: authHeaders(token)
        }
      );
      setMessage('Auction created successfully');
      setTitle('');
      setDescription('');
      setStartPrice('1');
      setEndTime('');
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? 'Failed to create auction');
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-lg border bg-white p-6">
      <h1 className="text-2xl font-semibold">Create Auction</h1>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <input className="w-full rounded border px-3 py-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea
          className="w-full rounded border px-3 py-2"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="number"
          min={1}
          placeholder="Start Price"
          value={startPrice}
          onChange={(e) => setStartPrice(e.target.value)}
          required
        />
        <input className="w-full rounded border px-3 py-2" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        <button className="rounded bg-brand px-4 py-2 text-white" type="submit">
          Save Auction
        </button>
      </form>
    </div>
  );
}
