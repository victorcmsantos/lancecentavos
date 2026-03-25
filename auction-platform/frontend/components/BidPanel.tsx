'use client';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography
} from '@mui/material';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, authHeaders } from '@/lib/api';
import { getCurrentUser, getToken, getTokenRole, setAuthSession } from '@/lib/auth';
import { Bid } from '@/lib/types';
import { formatCents } from '@/lib/money';

type BidUpdate = {
  auction_id: string;
  bid_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  end_time?: string;
  server_time_unix?: number;
};

function resolveWsBaseURL(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL;
  if (fromEnv) {
    try {
      const parsed = new URL(fromEnv);
      const currentHost = window.location.hostname.toLowerCase();
      const configuredHost = parsed.hostname.toLowerCase();
      const currentIsLocalhostFamily = currentHost === 'localhost' || currentHost.endsWith('.localhost');
      const configuredIsLocalhost = configuredHost === 'localhost';

      if (configuredIsLocalhost && !currentIsLocalhostFamily) {
        parsed.hostname = window.location.hostname;
      }

      return parsed.toString().replace(/\/$/, '');
    } catch {
      return fromEnv.replace(/\/$/, '');
    }
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.hostname}:18080`;
  }

  return '';
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 5, flex: 1 }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ mt: 1 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function BidPanel({
  auctionID,
  initialBids,
  initialCurrentPrice,
  auctionStatus
}: {
  auctionID: string;
  initialBids: Bid[];
  initialCurrentPrice: number;
  auctionStatus: 'draft' | 'active' | 'finished';
}) {
  function syncCreditsUI(nextCredits: number, userPayload?: any) {
    const token = getToken();
    if (!token) return;
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const nextUser = { ...currentUser, ...(userPayload ?? {}), bid_credits: nextCredits };
    setAuthSession(token, nextUser);
    window.dispatchEvent(new CustomEvent('user:bid-credits-updated', { detail: { bidCredits: nextCredits } }));
  }

  const router = useRouter();
  const [bids, setBids] = useState<Bid[]>(initialBids);
  const [currentPrice, setCurrentPrice] = useState<number>(initialCurrentPrice);
  const [error, setError] = useState('');
  const [availableCredits, setAvailableCredits] = useState<number | null>(null);
  const [usePollingFallback, setUsePollingFallback] = useState<boolean>(false);
  const quickFeed = bids.slice(0, 5);
  const isAuthenticated = Boolean(getToken());
  const tokenRole = getTokenRole();
  const isNormalUser = tokenRole === 'user';
  const bidActionDisabled = auctionStatus !== 'active' || !isAuthenticated || !isNormalUser;
  const primaryActionLabel = !isAuthenticated
    ? 'Entrar para participar'
    : !isNormalUser
      ? 'Apenas usuarios podem dar lance'
      : auctionStatus === 'active'
        ? 'Dar lance agora'
        : 'Lances indisponiveis';
  const secondaryActionLabel = !isAuthenticated ? 'Criar conta' : 'Comprar mais lances';

  const wsURL = useMemo(() => {
    const token = getToken();
    if (!token) return '';
    const base = resolveWsBaseURL();
    if (!base) return '';
    return `${base}/ws/auctions/${auctionID}?token=${token}`;
  }, [auctionID]);

  function dispatchBidUpdate(incoming: BidUpdate) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('auction:bid-update', {
        detail: {
          auctionId: incoming.auction_id,
          amount: incoming.amount,
          endTime: incoming.end_time,
          serverTimeUnix: incoming.server_time_unix,
          bid: {
            id: incoming.bid_id,
            auction_id: incoming.auction_id,
            user_id: incoming.user_id,
            amount: incoming.amount,
            created_at: incoming.created_at
          }
        }
      })
    );
  }

  useEffect(() => {
    const token = getToken();
    const authToken = token ?? '';
    const role = getTokenRole();
    if (!token || role !== 'user') {
      setAvailableCredits(null);
      return;
    }

    let active = true;
    async function loadCredits() {
      try {
        const response = await api.get('/users/me', { headers: authHeaders(authToken) });
        if (!active) return;
        const credits = typeof response?.data?.bid_credits === 'number' ? response.data.bid_credits : 0;
        setAvailableCredits(credits);
        syncCreditsUI(credits, response.data);
      } catch {
        if (!active) return;
        setAvailableCredits(null);
      }
    }

    void loadCredits();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!wsURL) {
      setUsePollingFallback(true);
      return;
    }

    let active = true;
    const ws = new WebSocket(wsURL);

    ws.onopen = () => {
      if (!active) return;
      setUsePollingFallback(false);
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as BidUpdate | { type: 'error'; error: string };
      if ('type' in payload && payload.type === 'error') {
        setError(payload.error);
        return;
      }
      const incoming = payload as BidUpdate;
      setBids((current) =>
        [
          {
            id: incoming.bid_id,
            auction_id: incoming.auction_id,
            user_id: incoming.user_id,
            amount: incoming.amount,
            created_at: incoming.created_at,
            received_at: incoming.created_at
          },
          ...current
        ].slice(0, 10)
      );
      setCurrentPrice(incoming.amount);
      dispatchBidUpdate(incoming);
    };

    ws.onerror = () => {
      if (!active) return;
      setUsePollingFallback(true);
    };

    ws.onclose = () => {
      if (!active) return;
      setUsePollingFallback(true);
    };

    return () => {
      active = false;
      ws.close();
    };
  }, [wsURL]);

  useEffect(() => {
    if (!usePollingFallback) return;

    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function syncFromAPI() {
      try {
        const response = await api.get(`/auctions/${auctionID}/bids?limit=10`);
        if (!active) return;
        const nextBids = Array.isArray(response.data) ? (response.data as Bid[]) : [];
        if (!nextBids.length) return;

        setBids((current) => {
          if (current[0]?.id === nextBids[0]?.id) {
            return current;
          }
          return nextBids.slice(0, 10);
        });

        const top = nextBids[0];
        setCurrentPrice(top.amount);
        dispatchBidUpdate({
          auction_id: top.auction_id,
          bid_id: top.id,
          user_id: top.user_id,
          amount: top.amount,
          created_at: top.created_at
        });
      } catch {
        // keep last state
      }
    }

    void syncFromAPI();
    timer = setInterval(syncFromAPI, 5000);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [auctionID, usePollingFallback]);

  async function handleBid(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (auctionStatus !== 'active') {
      setError('O leilao ainda nao esta ativo.');
      return;
    }

    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    if (getTokenRole() !== 'user') {
      setError('Apenas usuarios compradores podem participar desta disputa.');
      return;
    }

    if (typeof availableCredits === 'number' && availableCredits <= 0) {
      router.push('/user/bid-packages');
      return;
    }

    try {
      await api.post(
        `/auctions/${auctionID}/bids`,
        {
          client_timestamp: Math.floor(Date.now() / 1000)
        },
        {
          headers: authHeaders(token)
        }
      );
      if (typeof availableCredits === 'number') {
        const nextCredits = Math.max(0, availableCredits - 1);
        setAvailableCredits(nextCredits);
        syncCreditsUI(nextCredits);
      }

      try {
        const meResponse = await api.get('/users/me', { headers: authHeaders(token) });
        const nextCredits = typeof meResponse?.data?.bid_credits === 'number' ? meResponse.data.bid_credits : availableCredits;
        if (typeof nextCredits === 'number') {
          setAvailableCredits(nextCredits);
          syncCreditsUI(nextCredits, meResponse.data);
        }
      } catch {
        // keep optimistic update
      }
    } catch (err: any) {
      const message = err?.response?.data?.error ?? 'Falha ao enviar lance';
      if (typeof message === 'string' && message.toLowerCase().includes('insufficient bid credits')) {
        setAvailableCredits(0);
        syncCreditsUI(0);
        setError('Voce nao tem lances disponiveis. Compre um pacote para continuar.');
        return;
      }
      setError(message);
    }
  }

  return (
    <Stack spacing={3}>
      <Card component="form" onSubmit={handleBid} sx={{ borderRadius: 7 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} justifyContent="space-between" alignItems={{ lg: 'flex-end' }}>
              <Box sx={{ maxWidth: 620 }}>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
                  Acao principal
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  Dar um lance rapido
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Cada clique adiciona um centavo ao valor atual. A resposta visual e imediata e o feed atualiza em tempo real.
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', lg: 'auto' } }}>
                <StatTile label="Preco atual" value={formatCents(currentPrice)} />
                <StatTile label="Seus creditos" value={typeof availableCredits === 'number' ? availableCredits : '-'} />
              </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button type="submit" variant="contained" size="large" disabled={bidActionDisabled}>
                {primaryActionLabel}
              </Button>
              <Button variant="outlined" size="large" onClick={() => router.push(!isAuthenticated ? '/register' : '/user/bid-packages')}>
                {secondaryActionLabel}
              </Button>
            </Stack>

            {!isAuthenticated ? <Alert severity="info">Entre com sua conta para liberar saldo, historico e acesso ao lance em um clique.</Alert> : null}
            {isAuthenticated && !isNormalUser ? <Alert severity="warning">Esta sala aceita apenas contas de usuario comprador para novos lances.</Alert> : null}
            {auctionStatus !== 'active' ? <Alert severity="info">Os lances abrem quando o influenciador iniciar este leilao.</Alert> : null}
            {usePollingFallback ? <Alert severity="warning">Conexao em tempo real instavel. O feed foi alternado para atualizacao automatica.</Alert> : null}
            {typeof availableCredits === 'number' && availableCredits <= 3 && auctionStatus === 'active' ? (
              <Alert severity="warning">Seu saldo esta baixo. Recarregue antes de perder o ritmo da disputa.</Alert>
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 7 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
                Ao vivo
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                Feed da sala
              </Typography>
            </Box>
            <Chip color="primary" variant="outlined" label={`${quickFeed.length} eventos`} />
          </Stack>

          {!quickFeed.length ? <Alert severity="info" sx={{ mt: 3 }}>Nenhum movimento ainda. O primeiro lance vai aparecer aqui.</Alert> : null}

          <Stack spacing={1.5} sx={{ mt: 3 }} aria-live="polite">
            {quickFeed.map((bid, index) => (
              <Card key={bid.id} variant="outlined" sx={{ borderRadius: 5 }}>
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                        Participante
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace' }}>{bid.user_id.slice(0, 8)}</Typography>
                    </Stack>
                    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                        Lance
                      </Typography>
                      <Typography variant="h6">{formatCents(bid.amount)}</Typography>
                    </Stack>
                    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                        Horario
                      </Typography>
                      <Typography color="text.secondary">{new Date(bid.created_at).toLocaleTimeString('pt-BR')}</Typography>
                    </Stack>
                    {index === 0 ? <Chip color="primary" label="Lidera o feed" size="small" /> : null}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
