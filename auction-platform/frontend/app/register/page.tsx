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

function BenefitCard({ title, body }: { title: string; body: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 5 }}>
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>{body}</Typography>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', { ...form, role: 'user' });
      router.push('/login');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Falha no cadastro');
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', xl: 'minmax(340px, 0.88fr) minmax(0, 1.12fr)' }
      }}
    >
      <Card sx={{ borderRadius: 8 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.22em', fontWeight: 700 }}>
            Novo acesso
          </Typography>
          <Typography variant="h2" sx={{ mt: 2 }}>
            Crie sua conta e entre no ritmo certo
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, fontWeight: 400, maxWidth: 520 }}>
            O cadastro foi simplificado para levar voce da criacao da conta ate a vitrine com o menor atrito possivel.
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 4 }}>
            <BenefitCard title="Cadastro simples" body="Apenas e-mail e senha para comecar a participar das vitrines." />
            <BenefitCard title="Acesso imediato" body="Depois do cadastro, voce ja pode entrar e explorar o marketplace." />
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
                Cadastro
              </Typography>
            </Box>
            <Button component={Link} href="/login" variant="outlined">
              Ja tenho conta
            </Button>
          </Stack>

          <Stack component="form" onSubmit={handleSubmit} spacing={3} sx={{ mt: 4 }}>
            <TextField
              label="E-mail"
              type="email"
              placeholder="voce@exemplo.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Senha"
              type="password"
              placeholder="Minimo de 8 caracteres"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              fullWidth
              inputProps={{ minLength: 8 }}
              helperText="Voce podera recarregar lances e participar de qualquer vitrine logo apos entrar."
            />

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Criando conta...' : 'Criar conta'}
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
