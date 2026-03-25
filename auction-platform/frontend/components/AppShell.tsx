'use client';

import {
  alpha,
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  Toolbar,
  Typography
} from '@mui/material';
import Link from '@/components/NextLinkComposed';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthUser, clearToken, getCurrentUser, getToken, setAuthSession } from '@/lib/auth';
import { traduzirPerfil } from '@/lib/i18n';
import { api } from '@/lib/api';
import { useAppColorMode } from '@/components/AppThemeProvider';

type AppShellProps = {
  children: ReactNode;
  theme: {
    display_name: string;
    logo_url: string;
    primary_color: string;
  };
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolvePageContent(pathname: string, isAdmin: boolean, isInfluencer: boolean) {
  if (pathname.startsWith('/auction/')) {
    return {
      eyebrow: 'Sala ao vivo',
      title: 'Acompanhe o lance em tempo real',
      description: 'Veja a contagem, o valor atual e entre na disputa sem perder o ritmo.'
    };
  }

  if (pathname.startsWith('/influencer/') && !isInfluencer) {
    return {
      eyebrow: 'Vitrine do criador',
      title: 'Descubra produtos e entre na sala certa',
      description: 'Cada influenciador tem sua propria vitrine com leiloes, historico recente e acesso rapido.'
    };
  }

  if (pathname.startsWith('/user/bid-packages')) {
    return {
      eyebrow: 'Recarga de saldo',
      title: 'Compre pacotes e continue participando',
      description: 'Escolha um plano, reforce seus creditos e volte para a disputa sem sair do fluxo.'
    };
  }

  if (pathname.startsWith('/login')) {
    return {
      eyebrow: 'Acesso do usuario',
      title: 'Entre para acompanhar e dar lances',
      description: 'Seu login libera saldo, historico e acesso direto a qualquer sala ativa.'
    };
  }

  if (pathname.startsWith('/register')) {
    return {
      eyebrow: 'Nova conta',
      title: 'Crie seu acesso em menos de um minuto',
      description: 'Cadastro simples para comecar a navegar pelas vitrines e participar dos leiloes.'
    };
  }

  if (isAdmin) {
    return {
      eyebrow: 'Operacao da plataforma',
      title: 'Painel administrativo',
      description: 'Gerencie usuarios, acompanhe aprovacoes e mantenha o marketplace organizado.'
    };
  }

  if (isInfluencer) {
    return {
      eyebrow: 'Painel do influenciador',
      title: 'Publique produtos e monitore sua operacao',
      description: 'Crie leiloes, acompanhe o status e prepare novas vitrines para sua audiencia.'
    };
  }

  return {
    eyebrow: 'Marketplace ao vivo',
    title: 'Escolha um influenciador e entre no fluxo certo',
    description: 'A jornada agora destaca vitrines, saldo e acesso rapido para reduzir atrito ate o primeiro lance.'
  };
}

function SurfacePanel({ children }: { children: ReactNode }) {
  return (
    <Paper
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: 4,
        backgroundColor: (muiTheme) => alpha(muiTheme.palette.background.paper, 0.92),
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 24px 72px -52px rgba(0,0,0,0.76)'
            : '0 24px 72px -52px rgba(30,24,18,0.18)'
      }}
    >
      {children}
    </Paper>
  );
}

export function AppShell({ children, theme }: AppShellProps) {
  const pathname = usePathname();
  const { mode, toggleColorMode } = useAppColorMode();
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [nomeInfluenciadorNoTopo, setNomeInfluenciadorNoTopo] = useState('');

  useEffect(() => {
    setUser(getCurrentUser());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    setUser(getCurrentUser());
  }, [isReady, pathname]);

  useEffect(() => {
    const handleCreditsUpdated = () => {
      const latest = getCurrentUser();
      if (!latest) return;
      setUser(latest);
    };

    window.addEventListener('user:bid-credits-updated', handleCreditsUpdated);
    return () => window.removeEventListener('user:bid-credits-updated', handleCreditsUpdated);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const token = getToken();
    const authToken = token ?? '';
    if (!token) return;

    let ativo = true;
    async function refreshCurrentUser() {
      try {
        const response = await api.get('/users/me', { headers: { Authorization: `Bearer ${authToken}` } });
        if (!ativo) return;
        const nextUser = response.data as AuthUser;
        setAuthSession(authToken, nextUser);
        setUser(nextUser);
      } catch {
        // keep cached user
      }
    }

    void refreshCurrentUser();
    return () => {
      ativo = false;
    };
  }, [isReady, pathname]);

  useEffect(() => {
    if (user?.role !== 'influencer' || !user.id) {
      setNomeInfluenciadorNoTopo('');
      return;
    }

    const influencerUserID = user.id;
    let ativo = true;

    async function carregarInfluenciador() {
      try {
        const response = await api.get('/tenants?limit=200&offset=0');
        if (!ativo) return;
        const lista = Array.isArray(response?.data) ? response.data : [];
        const atual = lista.find((item: any) => item?.user_id === influencerUserID);
        const nome = typeof atual?.display_name === 'string' ? atual.display_name : '';
        setNomeInfluenciadorNoTopo(nome);
      } catch {
        if (!ativo) return;
        setNomeInfluenciadorNoTopo('');
      }
    }

    void carregarInfluenciador();

    return () => {
      ativo = false;
    };
  }, [user?.id, user?.role]);

  function handleLogout() {
    clearToken();
    setUser(null);
    const nextPath = pathname.startsWith('/influencer') || pathname.startsWith('/admin') ? '/' : pathname;
    window.location.assign(nextPath);
  }

  const isNormalUser = user?.role === 'user';
  const isInfluencer = user?.role === 'influencer';
  const isAdmin = user?.role === 'admin';
  const isAuthenticated = Boolean(user?.id);
  const homeHref = isAdmin ? '/admin' : isInfluencer ? '/influencer' : '/';
  const pageContent = resolvePageContent(pathname, isAdmin, isInfluencer);
  const navItems = isAdmin
    ? [{ href: '/admin', label: 'Usuarios' }]
    : isInfluencer
      ? [{ href: '/influencer', label: 'Painel' }]
      : isNormalUser
        ? [
            { href: '/', label: 'Explorar' },
            { href: '/user/bid-packages', label: 'Pacotes' }
          ]
        : [{ href: '/', label: 'Explorar' }];
  const utilityLabel = isNormalUser
    ? `${typeof user?.bid_credits === 'number' ? user.bid_credits : 0} lances`
    : isAuthenticated
      ? traduzirPerfil(user?.role)
      : 'visitante';

  return (
    <>
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: -9999,
          top: 16,
          zIndex: 2000,
          px: 2,
          py: 1.25,
          borderRadius: 999,
          bgcolor: 'text.primary',
          color: 'background.paper',
          textDecoration: 'none',
          '&:focus': {
            left: 16
          }
        }}
      >
        Pular para o conteudo
      </Box>

      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: 'blur(14px)',
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: (muiTheme) => alpha(muiTheme.palette.background.default, 0.8)
        }}
      >
        <Container maxWidth={false} sx={{ width: 'min(100%, 104rem)', px: { xs: 2, sm: 3, xl: 4 } }}>
          <Toolbar disableGutters sx={{ py: 2.5, display: 'block' }}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', lg: 'center' }}>
                <Stack component={Link} href={homeHref} direction="row" spacing={2} alignItems="center" sx={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
                  <Avatar
                    src={theme.logo_url || undefined}
                    alt={theme.display_name}
                    sx={{
                      width: 58,
                      height: 58,
                      bgcolor: theme.primary_color,
                      borderRadius: 2
                    }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.28em', fontWeight: 700 }}>
                      Lance de centavos
                    </Typography>
                    <Typography variant="h6" noWrap sx={{ mt: 0.5 }}>
                      {theme.display_name}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap" sx={{ ml: { lg: 'auto' }, width: { xs: '100%', lg: 'auto' } }}>
                  {navItems.map((item) => (
                    <Button
                      key={item.href}
                      component={Link}
                      href={item.href}
                      variant={isActivePath(pathname, item.href) ? 'contained' : 'text'}
                      color={isActivePath(pathname, item.href) ? 'primary' : 'inherit'}
                    >
                      {item.label}
                    </Button>
                  ))}
                  {isReady ? (
                    <Button variant="text" color="inherit" onClick={toggleColorMode}>
                      {mode === 'dark' ? 'Modo claro' : 'Modo escuro'}
                    </Button>
                  ) : null}
                  {isReady ? (
                    isAuthenticated ? (
                      <Button variant="outlined" color="inherit" onClick={handleLogout}>
                        Sair
                      </Button>
                    ) : (
                      <Button component={Link} href="/login" variant="contained">
                        Entrar
                      </Button>
                    )
                  ) : null}
                </Stack>
              </Stack>

              <SurfacePanel>
                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.45fr) minmax(320px, 0.55fr)' } }}>
                  <Box>
                    <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.3em', fontWeight: 700 }}>
                      {pageContent.eyebrow}
                    </Typography>
                    <Typography variant="h2" sx={{ mt: 1.5, maxWidth: 880 }}>
                      {pageContent.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 760, fontSize: { xs: '1rem', md: '1.08rem' }, lineHeight: 1.7 }}>
                      {pageContent.description}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: 1.5,
                      alignContent: 'start',
                      borderLeft: { xl: 1 },
                      borderTop: { xs: 1, xl: 0 },
                      borderColor: 'divider',
                      pl: { xl: 3 },
                      pt: { xs: 2.5, xl: 0 }
                    }}
                  >
                    <Box>
                      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.18em', color: 'text.secondary', fontWeight: 700 }}>
                        Status atual
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 1 }}>
                        {utilityLabel}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {nomeInfluenciadorNoTopo
                          ? `Canal vinculado: ${nomeInfluenciadorNoTopo}`
                          : isAuthenticated
                            ? 'Conta autenticada e pronta para navegar.'
                            : 'Entre para acompanhar os leiloes e recarregar saldo.'}
                      </Typography>
                    </Box>

                    <Divider flexItem />

                    <Stack direction={{ xs: 'column', sm: 'row', xl: 'column' }} spacing={1.25}>
                      <Button component={Link} href={homeHref} variant="outlined" color="inherit">
                        Ir para inicio
                      </Button>
                      {!isAuthenticated && !pathname.startsWith('/register') ? (
                        <Button component={Link} href="/register" variant="contained">
                          Criar conta
                        </Button>
                      ) : null}
                      {isNormalUser ? (
                        <Button component={Link} href="/user/bid-packages" variant="contained">
                          Recarregar saldo
                        </Button>
                      ) : null}
                    </Stack>
                  </Box>
                </Box>
              </SurfacePanel>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Box
        sx={{
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            insetInline: 0,
            top: 0,
            height: 240,
            pointerEvents: 'none',
            background:
              'linear-gradient(180deg, rgba(196,98,45,0.08) 0%, transparent 100%)'
          }
        }}
      >
        <Container maxWidth={false} sx={{ width: 'min(100%, 104rem)', px: { xs: 2, sm: 3, xl: 4 }, py: { xs: 4, sm: 5 } }}>
          <Stack direction={{ xs: 'column', xl: 'row' }} spacing={{ xs: 3, xl: 5 }} alignItems="flex-start">
            <Box id="main-content" sx={{ minWidth: 0, flex: 1, width: '100%' }}>
              {children}
            </Box>

            {isReady && isNormalUser ? (
              <Box sx={{ width: { xs: '100%', xl: 320 }, position: { xl: 'sticky' }, top: { xl: 224 } }}>
                <SurfacePanel>
                  <Stack spacing={2.25}>
                    <Box>
                      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.2em', fontWeight: 700 }}>
                        Sua conta
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 1 }}>
                        {typeof user?.bid_credits === 'number' ? user.bid_credits : 0} lances
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {user.email ?? 'Usuario ativo'}
                      </Typography>
                    </Box>

                    <Divider flexItem />

                    <Box>
                      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', color: 'text.secondary', fontWeight: 700 }}>
                        Perfil
                      </Typography>
                      <Typography sx={{ mt: 1 }}>{traduzirPerfil(user.role)}</Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.16em', color: 'text.secondary', fontWeight: 700 }}>
                        Identificacao
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, wordBreak: 'break-all' }}>
                        {user.id ?? '-'}
                      </Typography>
                    </Box>

                    <Stack spacing={1.25}>
                      <Button component={Link} href="/user/bid-packages" variant="contained" fullWidth>
                        Comprar pacotes
                      </Button>
                      <Button component={Link} href="/" variant="outlined" color="inherit" fullWidth>
                        Explorar vitrines
                      </Button>
                    </Stack>
                  </Stack>
                </SurfacePanel>
              </Box>
            ) : null}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
