'use client';

import {
  alpha,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography
} from '@mui/material';
import Link from 'next/link';
import { Auction, Bid, Tenant } from '@/lib/types';
import { formatCents } from '@/lib/money';
import { traduzirStatusLeilao } from '@/lib/i18n';
import { ImageCarousel } from '@/components/ImageCarousel';

function formatDateTime(value?: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function auctionCardSpan(status: Auction['status']): { md: string; xl: string } {
  if (status === 'active') return { md: 'span 2', xl: 'span 2' };
  if (status === 'draft') return { md: 'span 1', xl: 'span 1' };
  return { md: 'span 1', xl: 'span 1' };
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

function SummaryCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <Card sx={{ bgcolor: (theme) => alpha(theme.palette.background.paper, 0.72) }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.16em', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="h3" sx={{ mt: 1 }}>
          {value}
        </Typography>
        {helper ? <Typography color="text.secondary" sx={{ mt: 1.5 }}>{helper}</Typography> : null}
      </CardContent>
    </Card>
  );
}

export function InfluencerPageContent({
  influencer,
  orderedAuctions,
  bidsByAuctionEntries
}: {
  influencer: Tenant;
  orderedAuctions: Auction[];
  bidsByAuctionEntries: Array<readonly [string, Bid[]]>;
}) {
  const bidsByAuction = new Map<string, Bid[]>(bidsByAuctionEntries);
  const activeAuctions = orderedAuctions.filter((auction) => auction.status === 'active').length;
  const finishedAuctions = orderedAuctions.filter((auction) => auction.status === 'finished').length;
  const recentBidCount = bidsByAuctionEntries.reduce((total, [, bids]) => total + bids.length, 0);
  const featuredAuction = orderedAuctions[0] ?? null;
  const remainingAuctions = orderedAuctions.slice(1);

  return (
    <Stack spacing={5}>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.45fr) minmax(320px, 0.55fr)' } }}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.24em', fontWeight: 700 }}>
            Vitrine oficial
          </Typography>
          <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mt: 2.5 }}>
            <Avatar src={influencer.logo_url || undefined} alt={influencer.display_name} sx={{ width: 92, height: 92, borderRadius: 3, bgcolor: influencer.primary_color || 'primary.main' }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h2">{influencer.display_name}</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>@{influencer.subdomain}</Typography>
            </Box>
          </Stack>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 3, fontWeight: 400, lineHeight: 1.7, maxWidth: 760 }}>
            Veja todos os produtos deste influenciador, compare o status de cada leilao e entre apenas quando o ritmo fizer sentido para voce.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)', xl: '1fr' } }}>
          <SummaryCard label="Leiloes totais" value={orderedAuctions.length} />
          <SummaryCard label="Ativos agora" value={activeAuctions} />
          <SummaryCard label="Lances recentes" value={recentBidCount} />
        </Box>
      </Box>

      <Box sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider', py: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box sx={{ maxWidth: 580 }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
              Leitura da vitrine
            </Typography>
            <Typography variant="h4" sx={{ mt: 1.25 }}>
              O produto mais quente aparece primeiro. O restante vira grade de apoio.
            </Typography>
          </Box>
          <Box sx={{ maxWidth: 440 }}>
            <Typography color="text.secondary">
              {activeAuctions} salas em disputa agora e {finishedAuctions} leiloes encerrados para consulta de historico.
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'flex-end' }}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
              Produtos e lances
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              Leiloes desta vitrine
            </Typography>
          </Box>
          <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
            Cada card resume o produto, mostra atividade recente e leva voce diretamente para a sala do leilao.
          </Typography>
        </Stack>

        {activeAuctions > 0 ? <Alert severity="success">As salas ativas aparecem primeiro para acelerar sua entrada no leilao certo.</Alert> : null}

        {!orderedAuctions.length ? (
          <Card>
            <CardContent sx={{ py: 8 }}>
              <Typography align="center" color="text.secondary">
                Nenhum leilao encontrado para este influenciador.
              </Typography>
            </CardContent>
          </Card>
        ) : null}

        {featuredAuction ? (
          <Card>
            <CardActionArea component={Link} href={`/auction/${featuredAuction.id}`}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.15fr) minmax(340px, 0.85fr)' } }}>
                  <Box>
                    <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip {...statusChipProps(featuredAuction.status)} label={traduzirStatusLeilao(featuredAuction.status)} size="small" />
                      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.16em', fontWeight: 700 }}>
                        Produto em destaque
                      </Typography>
                    </Stack>
                    <Typography variant="h3" sx={{ mt: 2 }}>{featuredAuction.title}</Typography>
                    <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 680, lineHeight: 1.7 }}>{featuredAuction.description}</Typography>
                    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, mt: 3 }}>
                      <SummaryCard label="Preco atual" value={formatCents(featuredAuction.current_price)} />
                      <SummaryCard label="Valor do produto" value={formatCents(featuredAuction.product_value)} />
                      <SummaryCard label="Inicio" value={formatDateTime(featuredAuction.start_time)} />
                    </Box>
                  </Box>

                  <Box>
                    <ImageCarousel images={featuredAuction.image_urls ?? []} title={featuredAuction.title} />
                  </Box>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ) : null}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
          {remainingAuctions.map((auction) => {
            const bids = bidsByAuction.get(auction.id) ?? [];
            const ultimoLance = bids[0];
            const span = auctionCardSpan(auction.status);

            return (
              <Card key={auction.id} sx={{ gridColumn: { xs: 'span 1', md: span.md, xl: span.xl } }}>
                <CardActionArea component={Link} href={`/auction/${auction.id}`} sx={{ alignItems: 'stretch', height: '100%' }}>
                  <CardContent sx={{ p: 3, height: '100%' }}>
                    <Stack spacing={3} sx={{ height: '100%' }}>
                      <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ maxWidth: 560 }}>
                          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.16em', fontWeight: 700 }}>
                            Produto em destaque
                          </Typography>
                          <Typography variant="h5" sx={{ mt: 1.5 }}>
                            {auction.title}
                          </Typography>
                        </Box>
                        <Chip {...statusChipProps(auction.status)} label={traduzirStatusLeilao(auction.status)} size="small" />
                      </Stack>

                      <Typography color="text.secondary">{auction.description}</Typography>

                      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', xl: 'repeat(3, 1fr)' } }}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                              Preco atual
                            </Typography>
                            <Typography variant="h6" sx={{ mt: 1.25 }}>{formatCents(auction.current_price)}</Typography>
                          </CardContent>
                        </Card>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                              Valor do produto
                            </Typography>
                            <Typography variant="h6" sx={{ mt: 1.25 }}>{formatCents(auction.product_value)}</Typography>
                          </CardContent>
                        </Card>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                              Ultima atividade
                            </Typography>
                            <Typography sx={{ mt: 1.25 }}>{ultimoLance ? formatDateTime(ultimoLance.created_at) : 'Sem lances ainda'}</Typography>
                          </CardContent>
                        </Card>
                      </Box>

                      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="body2" color="text.secondary">Inicio: {formatDateTime(auction.start_time)}</Typography>
                        <Typography variant="body2" color="text.secondary">Encerramento: {formatDateTime(auction.end_time)}</Typography>
                      </Stack>

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                          Lances recentes
                        </Typography>
                        {!bids.length ? <Typography color="text.secondary" sx={{ mt: 1.5 }}>Sem lances ainda.</Typography> : null}
                        <Stack spacing={1.5} sx={{ mt: 2 }}>
                          {bids.map((bid) => (
                            <Card key={bid.id} variant="outlined">
                              <CardContent sx={{ py: 1.5 }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
                                  <Typography sx={{ fontFamily: 'monospace' }}>{bid.user_id.slice(0, 8)}</Typography>
                                  <Typography fontWeight={700}>{formatCents(bid.amount)}</Typography>
                                  <Typography color="text.secondary">{new Date(bid.created_at).toLocaleString('pt-BR')}</Typography>
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      </Box>

                      <Box sx={{ mt: 'auto' }}>
                        <Divider sx={{ mb: 2 }} />
                        <Button variant="contained">Abrir sala do leilao</Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      </Stack>
    </Stack>
  );
}
