import Link from 'next/link';

export default function InfluencerDashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Influencer Dashboard</h1>
      <div className="rounded-lg border bg-white p-4">
        <p className="text-slate-600">Manage your auctions and white-label branding.</p>
        <Link href="/influencer/create-auction" className="mt-3 inline-block rounded bg-brand px-4 py-2 text-white">
          Create Auction
        </Link>
      </div>
    </div>
  );
}
