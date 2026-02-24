import { api } from '@/lib/api';
import { Auction, Bid } from '@/lib/types';
import { Countdown } from '@/components/Countdown';
import { BidPanel } from '@/components/BidPanel';
import { BidHistory } from '@/components/BidHistory';
import { CurrentPrice } from '@/components/CurrentPrice';
import { ImageCarousel } from '@/components/ImageCarousel';

function formatDateTime(value?: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

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

export default async function AuctionPage({ params }: { params: { id: string } }) {
  const [auction, bids] = await Promise.all([getAuction(params.id), getBids(params.id)]);

  if (!auction) {
    return <p>Leilao nao encontrado.</p>;
  }

  const ultimoLance = bids[0];
  const ganhador = ultimoLance ? ultimoLance.user_id : 'sem lances';

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4">
        <div className="rounded-lg border bg-white p-4">
          <h1 className="text-2xl font-semibold">{auction.title}</h1>
          <ImageCarousel images={auction.image_urls ?? []} title={auction.title} />
          <p className="mt-2 text-slate-600">{auction.description}</p>
          <p className="mt-2 text-sm text-slate-600">Valor do Produto: R$ {(auction.product_value / 100).toFixed(2)}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm">Preco Atual</span>
            <CurrentPrice auctionID={auction.id} initialPrice={auction.current_price} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm">Contagem Regressiva</span>
            <Countdown auctionID={auction.id} endTime={auction.end_time} serverTimeUnix={auction.server_time_unix} />
          </div>
          {auction.status === 'draft' ? <p className="mt-3 text-sm text-slate-600">Inicia em: {formatDateTime(auction.start_time)}</p> : null}
          {auction.status === 'active' || auction.status === 'finished' ? (
            <p className="mt-2 text-sm text-slate-600">Iniciado em: {formatDateTime(auction.start_time)}</p>
          ) : null}
          {auction.status === 'finished' ? (
            <>
              <p className="mt-2 text-sm text-slate-600">Finalizado em: {formatDateTime(auction.end_time)}</p>
              <p className="mt-2 text-sm text-slate-600">Ganhador: {ganhador}</p>
            </>
          ) : null}
        </div>

        <BidPanel auctionID={auction.id} initialBids={bids} initialCurrentPrice={auction.current_price} auctionStatus={auction.status} />
      </section>

      <section>
        <BidHistory auctionID={auction.id} bids={bids} />
      </section>
    </div>
  );
}
