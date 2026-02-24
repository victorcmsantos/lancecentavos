'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthUser, clearToken, getCurrentUser, getToken, setAuthSession } from '@/lib/auth';
import { traduzirPerfil } from '@/lib/i18n';
import { api } from '@/lib/api';

type AppShellProps = {
  children: ReactNode;
  theme: {
    display_name: string;
    logo_url: string;
    primary_color: string;
  };
};

export function AppShell({ children, theme }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  const [nomeInfluenciadorNoTopo, setNomeInfluenciadorNoTopo] = useState('');

  useEffect(() => {
    setUser(getCurrentUser());
    const stored = localStorage.getItem('color_mode');
    const initial = stored === 'dark' ? 'dark' : 'light';
    setColorMode(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
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
        // ignore and keep cached user
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
    if (pathname.startsWith('/influencer')) {
      router.push('/');
    } else {
      router.refresh();
    }
  }

  function toggleColorMode() {
    const nextMode = colorMode === 'dark' ? 'light' : 'dark';
    setColorMode(nextMode);
    localStorage.setItem('color_mode', nextMode);
    document.documentElement.classList.toggle('dark', nextMode === 'dark');
  }

  const isNormalUser = user?.role === 'user';
  const isInfluencer = user?.role === 'influencer';
  const isAdmin = user?.role === 'admin';
  const isAuthenticated = Boolean(user?.id);

  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {theme.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={theme.logo_url} alt="logo" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-brand" />
            )}
            <span className="truncate font-semibold">{theme.display_name}</span>
          </div>
          <nav className="ml-auto flex items-center gap-3 text-sm">
            {nomeInfluenciadorNoTopo ? <span className="hidden max-w-[220px] truncate font-medium text-slate-700 md:inline">Influenciador: {nomeInfluenciadorNoTopo}</span> : null}
            {isAdmin ? (
              <Link href="/admin" className="rounded border px-3 py-1.5 text-slate-700">
                Inicio
              </Link>
            ) : isInfluencer ? (
              <Link href="/influencer" className="rounded border px-3 py-1.5 text-slate-700">
                Inicio
              </Link>
            ) : (
              <Link href="/" className="rounded border px-3 py-1.5 text-slate-700">
                Inicio
              </Link>
            )}
            {isReady ? (
              <button className="rounded border px-3 py-1.5 text-slate-700" type="button" onClick={toggleColorMode}>
                {colorMode === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
              </button>
            ) : null}
            {isReady ? (
              isAuthenticated ? (
                <button className="rounded border px-3 py-1.5 text-slate-700" type="button" onClick={handleLogout}>
                  Sair
                </button>
              ) : (
                <Link href="/login" className="rounded border px-3 py-1.5 text-slate-700">
                  Entrar
                </Link>
              )
            ) : null}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-8">
        {isReady && isNormalUser ? (
          <aside className="w-full max-w-xs rounded-lg border bg-white p-4 h-fit">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Menu do Usuario</h2>
            <div className="mt-3 space-y-2 text-sm">
              <p>
                <span className="font-medium">E-mail:</span> {user.email ?? '-'}
              </p>
              <p>
                <span className="font-medium">Perfil:</span> {traduzirPerfil(user.role)}
              </p>
              <p className="break-all">
                <span className="font-medium">ID do Usuario:</span> {user.id ?? '-'}
              </p>
              <p>
                <span className="font-medium">Lances disponiveis:</span> {typeof user.bid_credits === 'number' ? user.bid_credits : 0}
              </p>
              <p>
                <Link href="/user/bid-packages" className="font-medium text-brand">
                  Comprar pacotes de lances
                </Link>
              </p>
            </div>
          </aside>
        ) : null}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
