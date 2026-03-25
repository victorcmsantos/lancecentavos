'use client';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, authHeaders } from '@/lib/api';
import { clearToken, getToken, getTokenRole, setAuthSession } from '@/lib/auth';

type AdminUser = {
  id: string;
  email: string;
  role: string;
  is_approved?: boolean;
  created_at: string;
};

function UsersTable({
  users,
  emptyLabel,
  showApproval,
  onToggleApproval,
  togglingByUserID
}: {
  users: AdminUser[];
  emptyLabel: string;
  showApproval?: boolean;
  onToggleApproval?: (userID: string, isApproved: boolean) => void;
  togglingByUserID?: Record<string, boolean>;
}) {
  return (
    <TableContainer component={Card} variant="outlined" sx={{ borderRadius: 6 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>E-mail</TableCell>
            {showApproval ? <TableCell>Aprovacao</TableCell> : null}
            <TableCell>Criado em</TableCell>
            <TableCell>ID</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} hover>
              <TableCell>{user.email}</TableCell>
              {showApproval ? (
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(user.is_approved)}
                        disabled={Boolean(togglingByUserID?.[user.id])}
                        onChange={() => onToggleApproval?.(user.id, !(user.is_approved ?? false))}
                      />
                    }
                    label={user.is_approved ? 'Aprovado' : 'Pendente'}
                  />
                </TableCell>
              ) : null}
              <TableCell>{new Date(user.created_at).toLocaleString('pt-BR')}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>{user.id}</TableCell>
            </TableRow>
          ))}
          {!users.length ? (
            <TableRow>
              <TableCell colSpan={showApproval ? 4 : 3} sx={{ color: 'text.secondary' }}>
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <Card sx={{ borderRadius: 7 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.16em', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="h3" sx={{ mt: 1 }}>
          {value}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          {note}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const [isReady, setIsReady] = useState(false);
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [togglingByUserID, setTogglingByUserID] = useState<Record<string, boolean>>({});
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    setAuthRole(getTokenRole());
    setIsReady(true);
  }, []);

  const loadUsers = useCallback(async () => {
    const token = getToken();
    if (!token || authRole !== 'admin') {
      setUsers([]);
      return;
    }
    try {
      const response = await api.get('/admin/users?limit=100&offset=0', { headers: authHeaders(token) });
      setUsers(response.data as AdminUser[]);
    } catch (err: any) {
      if (err?.response?.status === 403 || err?.response?.status === 401) {
        setError('Acesso negado. Entre com uma conta admin.');
      } else {
        setError(err?.response?.data?.error ?? 'Falha ao carregar usuarios.');
      }
    }
  }, [authRole]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoggingIn(true);

    try {
      const response = await api.post('/auth/login', loginForm);
      const role = response?.data?.user?.role as string | undefined;
      if (role !== 'admin') {
        clearToken();
        setError('Esta conta nao e admin.');
        setLoggingIn(false);
        return;
      }

      setAuthSession(response.data.token, response.data.user);
      setAuthRole('admin');
      setMessage('Autenticado com sucesso.');
      setLoggingIn(false);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Falha no login');
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    clearToken();
    setAuthRole(null);
    setUsers([]);
    setMessage('');
    setError('');
    setLoggingIn(false);
  }

  async function handleToggleInfluencerApproval(userID: string, isApproved: boolean) {
    const token = getToken();
    if (!token || authRole !== 'admin') {
      setError('Apenas admin pode aprovar influenciador.');
      return;
    }
    setError('');
    setMessage('');
    setTogglingByUserID((prev) => ({ ...prev, [userID]: true }));
    try {
      await api.patch(`/admin/users/${userID}/approval`, { is_approved: isApproved }, { headers: authHeaders(token) });
      setMessage(isApproved ? 'Influenciador aprovado com sucesso.' : 'Influenciador definido como pendente.');
      await loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Falha ao atualizar aprovacao do influenciador.');
    } finally {
      setTogglingByUserID((prev) => ({ ...prev, [userID]: false }));
    }
  }

  if (!isReady) return null;

  if (authRole !== 'admin') {
    return (
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: 'minmax(340px, 0.9fr) minmax(0, 1.1fr)' } }}>
        <Card sx={{ borderRadius: 8 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.22em', fontWeight: 700 }}>
              Operacao protegida
            </Typography>
            <Typography variant="h2" sx={{ mt: 2 }}>
              Painel administrativo
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, fontWeight: 400, maxWidth: 540 }}>
              Esta area concentra aprovacao de influenciadores e leitura rapida dos perfis cadastrados.
            </Typography>

            <Box sx={{ mt: 4, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)', xl: '1fr' } }}>
              <SummaryCard label="Controle" value="Total" note="Veja usuarios, influencers e admins em um mesmo fluxo." />
              <SummaryCard label="Moderacao" value="Rapida" note="Aprovacao por toggle sem sair da lista." />
              <SummaryCard label="Leitura" value="Clara" note="Status, datas e IDs ficam visiveis no mesmo contexto." />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 8 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
              Acesso admin
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              Entrar
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1.5 }}>
              Use uma conta com perfil administrativo para abrir o painel.
            </Typography>

            <Stack component="form" onSubmit={handleLogin} spacing={3} sx={{ mt: 4 }}>
              <TextField label="E-mail" type="email" placeholder="admin@exemplo.com" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
              <TextField label="Senha" type="password" placeholder="Sua senha" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
              {message ? <Alert severity="success">{message}</Alert> : null}
              {error ? <Alert severity="error">{error}</Alert> : null}
              <Button type="submit" variant="contained" size="large" disabled={loggingIn}>
                {loggingIn ? 'Entrando...' : 'Entrar como admin'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const roleUsers = users.filter((user) => user.role === 'user');
  const influencers = users.filter((user) => user.role === 'influencer');
  const pendingInfluencers = influencers.filter((user) => !user.is_approved);
  const admins = users.filter((user) => user.role === 'admin');

  return (
    <Stack spacing={4}>
      <Card sx={{ borderRadius: 8 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ lg: 'flex-end' }}>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.22em', fontWeight: 700 }}>
                Administracao
              </Typography>
              <Typography variant="h2" sx={{ mt: 2 }}>
                Visao geral da plataforma
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, fontWeight: 400, maxWidth: 760 }}>
                O painel agora prioriza leitura de volume, aprovacao pendente e acoes diretas para reduzir o tempo de operacao.
              </Typography>
            </Box>
            <Button variant="outlined" size="large" onClick={handleLogout}>
              Sair
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' } }}>
        <SummaryCard label="Usuarios" value={roleUsers.length} note="Contas compradoras com acesso aos pacotes e salas." />
        <SummaryCard label="Influencers" value={influencers.length} note="Perfis de vitrine cadastrados na plataforma." />
        <SummaryCard label="Pendentes" value={pendingInfluencers.length} note="Influenciadores aguardando aprovacao." />
        <SummaryCard label="Admins" value={admins.length} note="Operadores com acesso ao painel administrativo." />
      </Box>

      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
            Usuarios
          </Typography>
          <Typography variant="h4" sx={{ mt: 1 }}>
            Compradores
          </Typography>
        </Box>
        <UsersTable users={roleUsers} emptyLabel="Nenhum usuario encontrado." />
      </Stack>

      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
            Influenciadores
          </Typography>
          <Typography variant="h4" sx={{ mt: 1 }}>
            Moderacao
          </Typography>
        </Box>
        <UsersTable
          users={influencers}
          emptyLabel="Nenhum influencer encontrado."
          showApproval
          onToggleApproval={handleToggleInfluencerApproval}
          togglingByUserID={togglingByUserID}
        />
      </Stack>

      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
            Operadores
          </Typography>
          <Typography variant="h4" sx={{ mt: 1 }}>
            Admins
          </Typography>
        </Box>
        <UsersTable users={admins} emptyLabel="Nenhum admin encontrado." />
      </Stack>
    </Stack>
  );
}
