import { api } from '@/lib/api';
import { Auction, Bid, Tenant } from '@/lib/types';
import { AuctionPageContent } from '@/components/AuctionPageContent';

async function getAuction(id: string): Promise<Auction | null> {
  try {
    const response = await api.get(`/auctions/${id}`);
    return response.data;
  } catch {
    return null;
  }
}

async function getBids(id: string): Promise<Bid[]> {
  try {
    const response = await api.get(`/auctions/${id}/bids?limit=10`);
    return response.data;
  } catch {
    return [];
  }
}

async function getTenantByInfluencer(influencerID: string): Promise<Tenant | null> {
  try {
    const response = await api.get('/tenants?limit=200&offset=0');
    const tenants = Array.isArray(response.data) ? (response.data as Tenant[]) : [];
    return tenants.find((tenant) => tenant.user_id === influencerID) ?? null;
  } catch {
    return null;
  }
}

export default async function AuctionPage({ params }: { params: { id: string } }) {
  const [auction, bids] = await Promise.all([getAuction(params.id), getBids(params.id)]);

  if (!auction) {
    return <div>Leilao nao encontrado.</div>;
  }

  const tenant = await getTenantByInfluencer(auction.influencer_id);
  return <AuctionPageContent auction={auction} bids={bids} tenant={tenant} />;
}
