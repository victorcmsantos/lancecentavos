import { api } from '@/lib/api';
import { Auction, Bid, Tenant } from '@/lib/types';
import { InfluencerPageContent } from '@/components/InfluencerPageContent';

async function getInfluencer(subdomain: string): Promise<Tenant | null> {
  try {
    const response = await api.get(`/tenants/${subdomain}`);
    return response.data;
  } catch {
    return null;
  }
}

async function getAuctionsByInfluencer(influencerUserID: string): Promise<Auction[]> {
  try {
    const response = await api.get(`/auctions?limit=20&offset=0&influencer_id=${influencerUserID}`);
    return response.data;
  } catch {
    return [];
  }
}

async function getBidsByAuctionID(auctionID: string): Promise<Bid[]> {
  try {
    const response = await api.get(`/auctions/${auctionID}/bids?limit=5`);
    return response.data;
  } catch {
    return [];
  }
}

export default async function InfluencerPage({ params }: { params: { subdomain: string } }) {
  const influencer = await getInfluencer(params.subdomain);

  if (!influencer) {
    return <div>Influenciador nao encontrado.</div>;
  }

  const auctions = await getAuctionsByInfluencer(influencer.user_id);
  const bidsByAuctionEntries = await Promise.all(auctions.map(async (auction) => [auction.id, await getBidsByAuctionID(auction.id)] as const));
  const orderedAuctions = [...auctions].sort((left, right) => {
    const rank = { active: 0, draft: 1, finished: 2 } as const;
    if (rank[left.status] !== rank[right.status]) return rank[left.status] - rank[right.status];
    const leftTime = left.start_time ? new Date(left.start_time).getTime() : 0;
    const rightTime = right.start_time ? new Date(right.start_time).getTime() : 0;
    return rightTime - leftTime;
  });

  return <InfluencerPageContent influencer={influencer} orderedAuctions={orderedAuctions} bidsByAuctionEntries={bidsByAuctionEntries} />;
}
