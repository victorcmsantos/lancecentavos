'use client';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography
} from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getCurrentUser, getToken, setAuthSession } from '@/lib/auth';
import { formatCents } from '@/lib/money';

type PackageOption = {
  id: 'starter' | 'standard' | 'pro';
  label: string;
  bids: number;
  priceInCents: number;
  highlight?: string;
};

const PACKAGES: PackageOption[] = [
  { id: 'starter', label: 'Starter', bids: 20, priceInCents: 2000, highlight: 'Entrada rapida para testar a plataforma' },
  { id: 'standard', label: 'Standard', bids: 60, priceInCents: 4500, highlight: 'Melhor equilibrio entre saldo e custo' },
  { id: 'pro', label: 'Pro', bids: 120, priceInCents: 6000, highlight: 'Volume alto para acompanhar varias salas' }
];

function SummaryCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <Card sx={{ borderRadius: 7 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.16em', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="h3" sx={{ mt: 1 }}>
          {value}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>{helper}</Typography>
      </CardContent>
    </Card>
  );
}

export default function BidPackagesPage() {
  function syncCreditsUI(nextCredits: number, userPayload?: any) {
    const token = getToken();
    if (!token) return;
    const currentUser = getCurrentUser();
    const mergedUser = {
      ...(currentUser ?? {}),
      ...(userPayload ?? {}),
      bid_credits: nextCredits
    };
    setAuthSession(token, mergedUser);
    window.dispatchEvent(new CustomEvent('user:bid-credits-updated', { detail: { bidCredits: nextCredits } }));
  }

  const [credits, setCredits] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [loadingPackage, setLoadingPackage] = useState<string>('');

  useEffect(() => {
    const token = getToken();
    const authToken = token ?? '';
    const user = getCurrentUser();
    if (typeof user?.bid_credits === 'number') {
      setCredits(user.bid_credits);
    }
    if (!token) return;

    let active = true;
    async function loadMe() {
      try {
        const response = await api.get('/users/me', { headers: { Authorization: `Bearer ${authToken}` } });
        if (!active) return;
        const me = response.data;
        const nextCredits = typeof me?.bid_credits === 'number' ? me.bid_credits : 0;
        setCredits(nextCredits);
        syncCreditsUI(nextCredits, me);
      } catch {
        // keep current state
      }
    }

    void loadMe();
    return () => {
      active = false;
    };
  }, []);

  async function handleBuy(packageID: PackageOption['id']) {
    setMessage('');
    const token = getToken();
    if (!token) {
      setMessage('Faca login para comprar pacotes.');
      return;
    }

    setLoadingPackage(packageID);
    try {
      const response = await api.post(
        '/users/me/bid-packages',
        { package_id: packageID },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const me = response.data;
      const nextCredits = typeof me?.bid_credits === 'number' ? me.bid_credits : credits;
      setCredits(nextCredits);
      syncCreditsUI(nextCredits, me);
      setMessage('Pacote comprado com sucesso.');
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? 'Falha ao comprar pacote.');
    } finally {
      setLoadingPackage('');
    }
  }

  const activePackage = PACKAGES.find((item) => item.id === loadingPackage);

  return (
    <Stack spacing={4}>
      <Card sx={{ borderRadius: 8 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.2fr) minmax(360px, 0.8fr)' }
            }}
          >
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.22em', fontWeight: 700 }}>
                Recarga de saldo
              </Typography>
              <Typography variant="h2" sx={{ mt: 2 }}>
                Escolha um pacote e continue na disputa
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, maxWidth: 720, fontWeight: 400 }}>
                A compra agora destaca saldo atual, custo por pacote e a melhor opcao para nao interromper sua jornada.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)', xl: '1fr' }
              }}
            >
              <SummaryCard label="Saldo atual" value={credits} helper="Veja seus lances antes de voltar para a sala." />
              <SummaryCard label="Pacotes" value={PACKAGES.length} helper="Opcoes claras para diferentes ritmos de compra." />
              <SummaryCard label="Fluxo" value="Continuo" helper="Compre e volte para a disputa sem perder contexto." />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(3, 1fr)' }
        }}
      >
        {PACKAGES.map((pack) => (
          <Card key={pack.id} sx={{ borderRadius: 7, position: 'relative', overflow: 'visible', borderColor: pack.id === 'standard' ? 'primary.main' : undefined }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.16em', fontWeight: 700 }}>
                    Pacote {pack.label}
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {pack.bids} lances
                  </Typography>
                </Box>
                {pack.id === 'standard' ? <Chip color="primary" label="Mais escolhido" /> : null}
              </Stack>

              <Typography variant="h3" sx={{ mt: 3 }}>
                {formatCents(pack.priceInCents)}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                {pack.highlight}
              </Typography>

              <Card variant="outlined" sx={{ mt: 3, borderRadius: 5 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                    Custo por lance
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1.25 }}>
                    {formatCents(Math.round(pack.priceInCents / pack.bids))}
                  </Typography>
                </CardContent>
              </Card>

              <Button
                variant="contained"
                size="large"
                fullWidth
                sx={{ mt: 3 }}
                disabled={loadingPackage === pack.id}
                onClick={() => handleBuy(pack.id)}
              >
                {loadingPackage === pack.id ? 'Processando compra...' : 'Comprar pacote'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>

      {message ? <Alert severity={message.toLowerCase().includes('sucesso') ? 'success' : 'error'}>{message}</Alert> : null}
      {activePackage ? <Alert severity="info">Confirmando a compra do pacote {activePackage.label}.</Alert> : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Button component={Link} href="/" variant="outlined" size="large">
          Explorar vitrines
        </Button>
        <Button component={Link} href="/login" variant="outlined" size="large">
          Trocar conta
        </Button>
      </Stack>
    </Stack>
  );
}
