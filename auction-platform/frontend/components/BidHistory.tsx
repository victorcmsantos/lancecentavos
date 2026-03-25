'use client';

import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Bid } from '@/lib/types';
import { formatCents } from '@/lib/money';

type BidUpdateEvent = CustomEvent<{
  auctionId?: string;
  bid?: Bid;
}>;

export function BidHistory({ auctionID, bids }: { auctionID: string; bids: Bid[] }) {
  const [liveBids, setLiveBids] = useState<Bid[]>(bids.slice(0, 10));

  useEffect(() => {
    setLiveBids(bids.slice(0, 10));
  }, [bids]);

  useEffect(() => {
    const handleBidUpdate = (event: Event) => {
      const custom = event as BidUpdateEvent;
      if (custom.detail?.auctionId !== auctionID || !custom.detail?.bid) return;

      const incoming = custom.detail.bid;
      setLiveBids((current) => [incoming, ...current.filter((bid) => bid.id !== incoming.id)].slice(0, 10));
    };

    window.addEventListener('auction:bid-update', handleBidUpdate);
    return () => window.removeEventListener('auction:bid-update', handleBidUpdate);
  }, [auctionID]);

  return (
    <Card sx={{ borderRadius: 7 }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
              Movimento recente
            </Typography>
            <Typography variant="h5" sx={{ mt: 1 }}>
              Historico de lances
            </Typography>
          </Box>
          <Chip color="primary" variant="outlined" label={`${liveBids.length} registros`} />
        </Stack>

        {!liveBids.length ? (
          <Card variant="outlined" sx={{ mt: 3, borderRadius: 5 }}>
            <CardContent>
              <Typography color="text.secondary">Ainda nao houve lances nesta sala.</Typography>
            </CardContent>
          </Card>
        ) : null}

        <Stack spacing={1.5} sx={{ mt: 3 }}>
          {liveBids.map((bid, index) => (
            <Card key={bid.id} variant="outlined" sx={{ borderRadius: 5 }}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
                      Participante
                    </Typography>
                    <Typography sx={{ fontFamily: 'monospace' }}>{bid.user_id.slice(0, 8)}</Typography>
                  </Stack>
                  <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
                      Valor
                    </Typography>
                    <Typography variant="h6">{formatCents(bid.amount)}</Typography>
                  </Stack>
                  <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
                      Horario
                    </Typography>
                    <Typography color="text.secondary">{new Date(bid.created_at).toLocaleTimeString('pt-BR')}</Typography>
                  </Stack>
                  {index === 0 ? <Chip color="primary" label="Mais recente" size="small" /> : null}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
