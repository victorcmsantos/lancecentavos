'use client';

import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import Link from 'next/link';

export default function CreateAuctionPage() {
  return (
    <Stack spacing={2} direction={{ xs: 'column', xl: 'row' }}>
      <Card sx={{ borderRadius: 8, flex: 0.9 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.22em', fontWeight: 700 }}>
            Fluxo consolidado
          </Typography>
          <Typography variant="h2" sx={{ mt: 2 }}>
            Criacao de produto integrada ao dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, fontWeight: 400 }}>
            A experiencia de publicacao agora fica centralizada no painel do influenciador para reduzir telas duplicadas e manter contexto.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 8, flex: 1.1 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
            Proximo passo
          </Typography>
          <Typography variant="h3" sx={{ mt: 1 }}>
            Use o painel principal
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            No dashboard voce encontra aprovacao da conta, criacao do produto, imagens e gerenciamento do status da sala em uma unica pagina.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
            <Button component={Link} href="/influencer" variant="contained" size="large">
              Ir para painel do influenciador
            </Button>
            <Button component={Link} href="/" variant="outlined" size="large">
              Voltar ao marketplace
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
