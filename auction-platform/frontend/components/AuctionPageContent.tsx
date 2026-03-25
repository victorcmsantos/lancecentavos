'use client';

import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { Auction, Bid, Tenant } from '@/lib/types';
import { Countdown } from '@/components/Countdown';
import { BidPanel } from '@/components/BidPanel';
import { BidHistory } from '@/components/BidHistory';
import { CurrentPrice } from '@/components/CurrentPrice';
import { ImageCarousel } from '@/components/ImageCarousel';
import { formatCents } from '@/lib/money';
import { traduzirStatusLeilao } from '@/lib/i18n';

function formatDateTime(value?: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function statusChipProps(status: Auction['status']) {
  switch (status) {
    case 'active':
      return { color: 'success' as const, variant: 'filled' as const };
    case 'finished':
      return { color: 'warning' as const, variant: 'filled' as const };
    default:
      return { color: 'default' as const, variant: 'outlined' as const };
  }
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 5 }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
          {label}
        </Typography>
        <Box sx={{ mt: 1.5 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

export function AuctionPageContent({
  auction,
  bids,
  tenant
}: {
  auction: Auction;
  bids: Bid[];
  tenant: Tenant | null;
}) {
  const lastBid = bids[0];
  const isActive = auction.status === 'active';
  const isFinished = auction.status === 'finished';

  return (
    <Stack spacing={4}>
      <Card sx={{ borderRadius: 8 }}>
        <CardContent sx={{ p: { xs: 3, md: 4, xl: 5 } }}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.4fr) minmax(360px, 0.6fr)' } }}>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip {...statusChipProps(auction.status)} label={traduzirStatusLeilao(auction.status)} />
                {tenant ? (
                  <Button component={Link} href={`/influencer/${tenant.subdomain}`} variant="text">
                    Ver vitrine de {tenant.display_name}
                  </Button>
                ) : null}
              </Stack>

              <Typography variant="h1" sx={{ mt: 2, fontSize: { xs: '2.8rem', md: '4rem', xl: '4.8rem' }, lineHeight: 1.02, maxWidth: 900 }}>
                {auction.title}
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, maxWidth: 820, fontWeight: 400, lineHeight: 1.5 }}>
                {auction.description}
              </Typography>

              <Box sx={{ mt: 3, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(12, 1fr)' } }}>
                <Box sx={{ gridColumn: { xl: 'span 4' } }}>
                  <StatCard label="Preco atual">
                    <CurrentPrice auctionID={auction.id} initialPrice={auction.current_price} />
                  </StatCard>
                </Box>
                <Box sx={{ gridColumn: { xl: 'span 3' } }}>
                  <StatCard label="Contagem">
                    <Countdown auctionID={auction.id} endTime={auction.end_time} serverTimeUnix={auction.server_time_unix} />
                  </StatCard>
                </Box>
                <Box sx={{ gridColumn: { xl: 'span 2' } }}>
                  <StatCard label="Valor do produto">
                    <Typography variant="h5">{formatCents(auction.product_value)}</Typography>
                  </StatCard>
                </Box>
                <Box sx={{ gridColumn: { xl: 'span 3' } }}>
                  <StatCard label="Ultimo lance">
                    <Typography>{lastBid ? formatDateTime(lastBid.created_at) : 'Sem atividade'}</Typography>
                  </StatCard>
                </Box>
              </Box>
            </Box>

            <Card variant="outlined" sx={{ borderRadius: 7, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
                  Resumo da sala
                </Typography>
                <Stack spacing={2.5} sx={{ mt: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Typography color="text.secondary">Canal</Typography>
                    <Typography fontWeight={700} textAlign="right">{tenant?.display_name ?? 'Marketplace'}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Typography color="text.secondary">Inicio</Typography>
                    <Typography fontWeight={700} textAlign="right">{formatDateTime(auction.start_time)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Typography color="text.secondary">Encerramento</Typography>
                    <Typography fontWeight={700} textAlign="right">{formatDateTime(auction.end_time)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Typography color="text.secondary">Participacao</Typography>
                    <Typography fontWeight={700} textAlign="right">
                      {isFinished ? (lastBid ? `Vencedor: ${lastBid.user_id.slice(0, 8)}` : 'Sem vencedor') : isActive ? 'Disputa em andamento' : 'Aguardando inicio'}
                    </Typography>
                  </Stack>
                </Stack>

                {isFinished ? <Alert severity="info" sx={{ mt: 3 }}>A disputa terminou. Use o historico abaixo para revisar o fechamento da sala.</Alert> : null}
                {!isFinished && !isActive ? <Alert severity="warning" sx={{ mt: 3 }}>Este leilao ainda nao foi iniciado. A sala abre automaticamente assim que o influenciador liberar os lances.</Alert> : null}
              </CardContent>
            </Card>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: 'minmax(360px, 0.8fr) minmax(0, 1fr) minmax(360px, 0.9fr)' }, alignItems: 'start' }}>
        <Card sx={{ borderRadius: 7, position: { xl: 'sticky' }, top: { xl: 212 } }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2}>
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
                  Produto
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  Visual do item
                </Typography>
              </Box>
              <Chip color="primary" variant="outlined" label={`${bids.length} lances carregados`} />
            </Stack>
            <ImageCarousel images={auction.image_urls ?? []} title={auction.title} />
          </CardContent>
        </Card>

        <BidPanel auctionID={auction.id} initialBids={bids} initialCurrentPrice={auction.current_price} auctionStatus={auction.status} />

        <BidHistory auctionID={auction.id} bids={bids} />
      </Box>
    </Stack>
  );
}
