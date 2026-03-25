'use client';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, authHeaders } from '@/lib/api';
import { clearToken, getCurrentUser, getToken, getTokenRole, setAuthSession } from '@/lib/auth';
import { Auction } from '@/lib/types';
import { formatCents, parseReaisToCents } from '@/lib/money';
import { filesToDataURLs, MAX_IMAGE_COUNT, MAX_IMAGE_SIZE_BYTES } from '@/lib/images';
import { ImageCarousel } from '@/components/ImageCarousel';

type Mode = 'login' | 'register';

function apiErrorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.error;
  const status = err?.response?.status;
  if (typeof message === 'string' && message.trim() !== '') {
    if (message.toLowerCase().includes('duplicate key')) {
      return 'E-mail ou subdominio ja existe. Tente outro ou faca login.';
    }
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

function formatDate(value?: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function statusChipProps(status: Auction['status']) {
  switch (status) {
    case 'active':
      return { color: 'success' as const, variant: 'filled' as const, label: 'ativo' };
    case 'finished':
      return { color: 'warning' as const, variant: 'filled' as const, label: 'encerrado' };
    default:
      return { color: 'default' as const, variant: 'outlined' as const, label: 'rascunho' };
  }
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

export default function InfluencerDashboardPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [savingAuction, setSavingAuction] = useState(false);
  const [auctionActionID, setAuctionActionID] = useState('');
  const [createAuctionForm, setCreateAuctionForm] = useState({
    title: '',
    description: '',
    productValue: '',
    countdownSec: '3600',
    startTime: '',
    imageURLs: [] as string[]
  });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    display_name: '',
    subdomain: '',
    logo_url: '',
    primary_color: '#0F766E'
  });

  const currentUser = getCurrentUser();
  const isInfluencerApproved = currentUser?.role === 'influencer' ? currentUser?.is_approved !== false : false;

  useEffect(() => {
    setAuthRole(getTokenRole());
    setIsReady(true);
  }, []);

  const loadAuctions = useCallback(async () => {
    const token = getToken();
    const role = getTokenRole();
    const user = getCurrentUser();
    if (!token || role !== 'influencer' || !user?.id) {
      setAuctions([]);
      return;
    }
    try {
      const response = await api.get(`/auctions?limit=50&offset=0&influencer_id=${user.id}`, { headers: authHeaders(token) });
      setAuctions(response.data as Auction[]);
    } catch {
      setAuctions([]);
    }
  }, []);

  useEffect(() => {
    void loadAuctions();
  }, [authRole, loadAuctions]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoadingAuth(true);

    try {
      const response = await api.post('/auth/login', loginForm);
      const role = response?.data?.user?.role as string | undefined;
      if (role !== 'influencer') {
        clearToken();
        setError('Esta conta nao e de influenciador.');
        setLoadingAuth(false);
        return;
      }

      setAuthSession(response.data.token, response.data.user);
      setAuthRole('influencer');
      setMessage(response?.data?.user?.is_approved === false ? 'Conta autenticada. Aguarde aprovacao do admin para criar produtos.' : 'Autenticado com sucesso.');
      setLoadingAuth(false);
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Falha no login'));
      setLoadingAuth(false);
    }
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoadingAuth(true);

    try {
      await api.post('/auth/register', { ...registerForm, role: 'influencer' });
      const response = await api.post('/auth/login', {
        email: registerForm.email,
        password: registerForm.password
      });
      setAuthSession(response.data.token, response.data.user);
      setAuthRole('influencer');
      setMessage('Conta criada. Aguarde aprovacao do admin para publicar produtos.');
      setLoadingAuth(false);
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Falha no cadastro'));
      setLoadingAuth(false);
    }
  }

  function handleLogout() {
    clearToken();
    setAuthRole(null);
    setMessage('');
    setError('');
    setAuctions([]);
    setLoadingAuth(false);
    window.location.assign('/');
  }

  async function handleImageSelection(files: FileList | null) {
    if (!files?.length) {
      setCreateAuctionForm((prev) => ({ ...prev, imageURLs: [] }));
      return;
    }
    const { images, errors } = await filesToDataURLs(files);
    setCreateAuctionForm((prev) => ({ ...prev, imageURLs: images }));
    if (errors.length) {
      setError(errors.join(' '));
    }
  }

  async function handleCreateAuction(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    const token = getToken();
    if (!token || getTokenRole() !== 'influencer') {
      setError('Faca login como influenciador primeiro.');
      return;
    }

    const productValueInCents = parseReaisToCents(createAuctionForm.productValue);
    if (productValueInCents === null) {
      setError('Informe um valor do produto valido em reais. Ex.: 199,90');
      return;
    }

    setSavingAuction(true);
    try {
      await api.post(
        '/auctions',
        {
          title: createAuctionForm.title,
          description: createAuctionForm.description,
          image_urls: createAuctionForm.imageURLs,
          product_value: productValueInCents,
          start_price: 1,
          countdown_seconds: Number(createAuctionForm.countdownSec),
          start_time: createAuctionForm.startTime ? new Date(createAuctionForm.startTime).toISOString() : null
        },
        { headers: authHeaders(token) }
      );
      setMessage('Produto criado com sucesso.');
      setCreateAuctionForm({
        title: '',
        description: '',
        productValue: '',
        countdownSec: '3600',
        startTime: '',
        imageURLs: []
      });
      await loadAuctions();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Falha ao criar leilao.');
    } finally {
      setSavingAuction(false);
    }
  }

  async function handleAuctionAction(auctionID: string, action: 'start' | 'finish') {
    const token = getToken();
    if (!token || getTokenRole() !== 'influencer') {
      setError('Faca login como influenciador primeiro.');
      return;
    }

    setError('');
    setMessage('');
    setAuctionActionID(`${action}:${auctionID}`);
    try {
      await api.post(`/auctions/${auctionID}/${action}`, {}, { headers: authHeaders(token) });
      setMessage(action === 'start' ? 'Leilao iniciado com sucesso.' : 'Leilao encerrado com sucesso.');
      await loadAuctions();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? `Falha ao ${action === 'start' ? 'iniciar' : 'encerrar'} leilao.`);
    } finally {
      setAuctionActionID('');
    }
  }

  if (!isReady) {
    return null;
  }

  if (authRole === 'influencer') {
    const draftAuctions = auctions.filter((auction) => auction.status === 'draft');
    const activeAuctions = auctions.filter((auction) => auction.status === 'active');
    const finishedAuctions = auctions.filter((auction) => auction.status === 'finished');

    return (
      <Stack spacing={4}>
        <Card sx={{ borderRadius: 8 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ lg: 'flex-end' }}>
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.22em', fontWeight: 700 }}>
                  Painel do influenciador
                </Typography>
                <Typography variant="h2" sx={{ mt: 2 }}>
                  Operacao da sua vitrine
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, fontWeight: 400, maxWidth: 760 }}>
                  O fluxo agora concentra aprovacao, publicacao e controle das salas em uma unica tela.
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button component={Link} href="/" variant="outlined" size="large">
                  Ver marketplace
                </Button>
                <Button variant="outlined" size="large" onClick={handleLogout}>
                  Sair
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' } }}>
          <SummaryCard label="Conta" value={isInfluencerApproved ? 'Aprovada' : 'Pendente'} note={currentUser?.email ?? 'Sem e-mail'} />
          <SummaryCard label="Produtos" value={auctions.length} note="Total de leiloes cadastrados na sua vitrine." />
          <SummaryCard label="Ativos" value={activeAuctions.length} note="Salas abertas agora para a audiencia." />
          <SummaryCard label="Encerrados" value={finishedAuctions.length} note="Leiloes finalizados para consulta de historico." />
        </Box>

        {!isInfluencerApproved ? <Alert severity="warning">Sua conta esta aguardando aprovacao do admin antes de publicar produtos.</Alert> : null}
        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

        {isInfluencerApproved ? (
          <Card sx={{ borderRadius: 8 }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2}>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
                    Novo produto
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 1 }}>
                    Criar leilao
                  </Typography>
                </Box>
                <Chip color="primary" variant="outlined" label={`Ate ${MAX_IMAGE_COUNT} imagens`} />
              </Stack>

              <Box component="form" onSubmit={handleCreateAuction} sx={{ mt: 4, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' } }}>
                <Stack spacing={3}>
                  <TextField label="Titulo" placeholder="Ex.: iPhone 16 Pro Max" value={createAuctionForm.title} onChange={(e) => setCreateAuctionForm({ ...createAuctionForm, title: e.target.value })} required />
                  <TextField label="Descricao" placeholder="Descreva o item, estado, diferenciais e contexto da campanha." value={createAuctionForm.description} onChange={(e) => setCreateAuctionForm({ ...createAuctionForm, description: e.target.value })} multiline minRows={6} />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="Valor do produto" placeholder="Ex.: 199,90" value={createAuctionForm.productValue} onChange={(e) => setCreateAuctionForm({ ...createAuctionForm, productValue: e.target.value })} required fullWidth />
                    <TextField label="Contagem regressiva" type="number" inputProps={{ min: 10 }} value={createAuctionForm.countdownSec} onChange={(e) => setCreateAuctionForm({ ...createAuctionForm, countdownSec: e.target.value })} helperText="Tempo em segundos antes do encerramento." required fullWidth />
                  </Stack>
                  <TextField label="Inicio programado" type="datetime-local" value={createAuctionForm.startTime} onChange={(e) => setCreateAuctionForm({ ...createAuctionForm, startTime: e.target.value })} InputLabelProps={{ shrink: true }} required />
                </Stack>

                <Stack spacing={3}>
                  <Box>
                    <Button variant="outlined" component="label">
                      Selecionar imagens
                      <input hidden type="file" accept="image/*" multiple onChange={(e) => void handleImageSelection(e.target.files)} />
                    </Button>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 1.5 }}>
                      Ate {MAX_IMAGE_COUNT} imagens por produto. Tamanho maximo por imagem: {Math.floor(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB.
                    </Typography>
                  </Box>

                  {createAuctionForm.imageURLs.length ? (
                    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' } }}>
                      {createAuctionForm.imageURLs.map((url, index) => (
                        <Card key={`${index}`} sx={{ borderRadius: 5, overflow: 'hidden' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Preview ${index + 1}`} className="h-32 w-full object-cover" />
                        </Card>
                      ))}
                    </Box>
                  ) : (
                    <Alert severity="info">Adicione imagens para deixar a vitrine mais forte e aumentar a conversao da sala.</Alert>
                  )}

                  <Button type="submit" variant="contained" size="large" fullWidth disabled={savingAuction}>
                    {savingAuction ? 'Salvando produto...' : 'Publicar produto'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        ) : null}

        <Card sx={{ borderRadius: 8 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'flex-end' }}>
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em', fontWeight: 700 }}>
                  Leiloes da vitrine
                </Typography>
                <Typography variant="h3" sx={{ mt: 1 }}>
                  Gerenciar salas
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip variant="outlined" label={`${draftAuctions.length} rascunhos`} />
                <Chip color="success" variant="outlined" label={`${activeAuctions.length} ativos`} />
              </Stack>
            </Stack>

            {!auctions.length ? <Alert severity="info" sx={{ mt: 3 }}>Nenhum produto ainda. Crie o primeiro item para montar sua vitrine.</Alert> : null}

            <Stack spacing={3} sx={{ mt: 3 }}>
              {auctions.map((auction) => {
                const actionKey = auctionActionID.split(':');
                const isHandlingThisAuction = actionKey[1] === auction.id;
                const chip = statusChipProps(auction.status);

                return (
                  <Card key={auction.id} variant="outlined" sx={{ borderRadius: 6 }}>
                    <CardContent>
                      <Stack spacing={3}>
                        <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} justifyContent="space-between" alignItems={{ xl: 'flex-start' }}>
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="flex-start">
                              <Box>
                                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.16em', fontWeight: 700 }}>
                                  Produto publicado
                                </Typography>
                                <Typography variant="h5" sx={{ mt: 1.5 }}>
                                  {auction.title}
                                </Typography>
                              </Box>
                              <Chip {...chip} />
                            </Stack>

                            <Typography color="text.secondary" sx={{ mt: 2 }}>
                              {auction.description}
                            </Typography>

                            <ImageCarousel images={auction.image_urls ?? []} title={auction.title} />

                            <Box sx={{ mt: 3, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' } }}>
                              <SummaryCard label="Valor" value={formatCents(auction.product_value)} note="Preco cheio do item anunciado." />
                              <SummaryCard label="Preco atual" value={formatCents(auction.current_price)} note="Ultimo valor da disputa." />
                              <SummaryCard label="Repasse" value={formatCents(auction.influencer_transfer)} note="Transferencia prevista para o criador." />
                              <SummaryCard label="Inicio" value={formatDate(auction.start_time)} note="Horario programado da sala." />
                            </Box>
                          </Box>

                          <Stack spacing={1.5} sx={{ width: { xs: '100%', xl: 260 } }}>
                            <Button component={Link} href={`/auction/${auction.id}`} variant="contained" fullWidth>
                              Abrir sala
                            </Button>
                            {auction.status === 'draft' ? (
                              <Button variant="outlined" fullWidth disabled={isHandlingThisAuction} onClick={() => void handleAuctionAction(auction.id, 'start')}>
                                {isHandlingThisAuction && actionKey[0] === 'start' ? 'Iniciando...' : 'Iniciar leilao'}
                              </Button>
                            ) : null}
                            {auction.status === 'active' ? (
                              <Button variant="outlined" color="warning" fullWidth disabled={isHandlingThisAuction} onClick={() => void handleAuctionAction(auction.id, 'finish')}>
                                {isHandlingThisAuction && actionKey[0] === 'finish' ? 'Encerrando...' : 'Encerrar leilao'}
                              </Button>
                            ) : null}
                            <Alert severity="info">Fim previsto: {formatDate(auction.end_time)}</Alert>
                          </Stack>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: 'minmax(340px, 0.95fr) minmax(0, 1.05fr)' } }}>
      <Card sx={{ borderRadius: 8 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.22em', fontWeight: 700 }}>
            Canal do criador
          </Typography>
          <Typography variant="h2" sx={{ mt: 2 }}>
            Abra sua vitrine e opere os leiloes com clareza
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, fontWeight: 400, maxWidth: 540 }}>
            O acesso do influenciador agora organiza autenticacao, cadastro e dados da marca em um fluxo unico.
          </Typography>

          <Box sx={{ mt: 4, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)', xl: '1fr' } }}>
            <SummaryCard label="Cadastro" value="Marca" note="Configure nome, subdominio, logo e cor principal." />
            <SummaryCard label="Aprovacao" value="Admin" note="Seu canal passa por revisao antes de publicar produtos." />
            <SummaryCard label="Operacao" value="Leiloes" note="Depois da aprovacao, voce cria, inicia e encerra salas no mesmo painel." />
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 8 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Tabs value={mode} onChange={(_, nextValue) => setMode(nextValue)} sx={{ mb: 3 }}>
            <Tab value="login" label="Entrar" />
            <Tab value="register" label="Cadastrar influenciador" />
          </Tabs>

          {mode === 'login' ? (
            <Stack component="form" onSubmit={handleLogin} spacing={3}>
              <TextField label="E-mail" type="email" placeholder="criador@exemplo.com" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
              <TextField label="Senha" type="password" placeholder="Sua senha" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
              {error ? <Alert severity="error">{error}</Alert> : null}
              {message ? <Alert severity="success">{message}</Alert> : null}
              <Button type="submit" variant="contained" size="large" disabled={loadingAuth}>
                {loadingAuth ? 'Entrando...' : 'Entrar como influenciador'}
              </Button>
            </Stack>
          ) : (
            <Stack component="form" onSubmit={handleRegister} spacing={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="E-mail" type="email" placeholder="criador@exemplo.com" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} required fullWidth />
                <TextField label="Senha" type="password" placeholder="Minimo de 8 caracteres" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} required fullWidth inputProps={{ minLength: 8 }} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Nome de exibicao" placeholder="Ex.: Lance da Mari" value={registerForm.display_name} onChange={(e) => setRegisterForm({ ...registerForm, display_name: e.target.value })} required fullWidth />
                <TextField label="Subdominio" placeholder="mari" value={registerForm.subdomain} onChange={(e) => setRegisterForm({ ...registerForm, subdomain: e.target.value.toLowerCase() })} required fullWidth />
              </Stack>
              <TextField label="URL do logo" placeholder="https://..." value={registerForm.logo_url} onChange={(e) => setRegisterForm({ ...registerForm, logo_url: e.target.value })} />
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700 }}>
                  Cor principal
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input type="color" value={registerForm.primary_color} onChange={(e) => setRegisterForm({ ...registerForm, primary_color: e.target.value })} />
                  <Card variant="outlined" sx={{ borderRadius: 5, flex: 1 }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                      <Avatar sx={{ bgcolor: registerForm.primary_color, borderRadius: 3 }}>
                        {registerForm.display_name?.charAt(0)?.toUpperCase() || 'L'}
                      </Avatar>
                      <Box>
                        <Typography fontWeight={700}>{registerForm.display_name || 'Nome da vitrine'}</Typography>
                        <Typography color="text.secondary">@{registerForm.subdomain || 'subdominio'}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Stack>
              {error ? <Alert severity="error">{error}</Alert> : null}
              {message ? <Alert severity="success">{message}</Alert> : null}
              <Button type="submit" variant="contained" size="large" disabled={loadingAuth}>
                {loadingAuth ? 'Criando conta...' : 'Criar conta de influenciador'}
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
