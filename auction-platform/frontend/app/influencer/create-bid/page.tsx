'use client';

import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import Link from 'next/link';

export default function CreateBidPage() {
  return (
    <Stack spacing={2} direction={{ xs: 'column', xl: 'row' }}>
      <Card sx={{ borderRadius: 8, flex: 0.9 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.22em', fontWeight: 700 }}>
            Operacao centralizada
          </Typography>
          <Typography variant="h2" sx={{ mt: 2 }}>
            Os lances agora acontecem na sala do leilao
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, fontWeight: 400 }}>
            Para evitar etapas paralelas e confusao de contexto, o fluxo principal leva o usuario direto para a sala ao vivo.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 8, flex: 1.1 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
            Acesso correto
          </Typography>
          <Typography variant="h3" sx={{ mt: 1 }}>
            Abra ou gerencie uma sala
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Influenciadores iniciam ou encerram leiloes no dashboard. Usuarios entram na sala publica para acompanhar o feed em tempo real e dar lances.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
            <Button component={Link} href="/influencer" variant="contained" size="large">
              Ir para painel do influenciador
            </Button>
            <Button component={Link} href="/" variant="outlined" size="large">
              Explorar vitrines
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
