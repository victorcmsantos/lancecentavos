'use client';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { clearToken, setAuthSession } from '@/lib/auth';

function apiErrorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.error;
  const status = err?.response?.status;
  if (typeof message === 'string' && message.trim() !== '') {
    return message;
  }
  if (err?.code === 'ERR_NETWORK') {
    return 'Nao foi possivel acessar a API. Verifique se o backend esta rodando e o CORS configurado.';
  }
  if (typeof status === 'number') {
    return `${fallback} (HTTP ${status})`;
  }
  if (typeof err?.message === 'string' && err.message.trim() !== '') {
    return `${fallback}: ${err.message}`;
  }
  return fallback;
}

function InfoCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 5 }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.16em', fontWeight: 700 }}>
          {step}
        </Typography>
        <Typography variant="h6" sx={{ mt: 1.5 }}>
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          {body}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const role = response?.data?.user?.role;
      if (role !== 'user') {
        clearToken();
        setError('Este login e apenas para usuarios comuns. Influenciadores devem usar /influencer.');
        setLoading(false);
        return;
      }
      setAuthSession(response.data.token, response.data.user);
      router.push('/');
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Falha no login'));
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', xl: 'minmax(340px, 0.9fr) minmax(0, 1.1fr)' }
      }}
    >
      <Card sx={{ borderRadius: 8 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.22em', fontWeight: 700 }}>
            Acesso rapido
          </Typography>
          <Typography variant="h2" sx={{ mt: 2 }}>
            Entre e volte direto para a disputa
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, fontWeight: 400, maxWidth: 520 }}>
            O login agora prioriza saldo, salas ativas e retomada da jornada sem passos extras.
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 4 }}>
            <InfoCard step="1. Entrar" title="Acesse com seu e-mail" body="Use sua conta para liberar saldo, historico e acesso direto a qualquer sala ativa." />
            <InfoCard step="2. Explorar" title="Veja vitrines e salas ativas" body="A navegacao te leva do marketplace para o leilao com menos atrito." />
            <InfoCard step="3. Lance" title="Use seu saldo sem sair do fluxo" body="Recarga e sala ao vivo ficam conectadas no mesmo percurso." />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 8 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
                Conta do usuario
              </Typography>
              <Typography variant="h3" sx={{ mt: 1 }}>
                Entrar
              </Typography>
            </Box>
            <Button component={Link} href="/register" variant="outlined">
              Criar conta
            </Button>
          </Stack>

          <Stack component="form" onSubmit={handleSubmit} spacing={3} sx={{ mt: 4 }}>
            <TextField label="E-mail" type="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
            <TextField label="Senha" type="password" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth helperText="Este acesso e exclusivo para usuarios compradores. Influenciadores entram em /influencer." />
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              <Button component={Link} href="/" variant="outlined" size="large">
                Voltar para vitrines
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
