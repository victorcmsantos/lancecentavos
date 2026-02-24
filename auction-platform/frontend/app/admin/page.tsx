'use client';

import { FormEvent, useEffect, useState } from 'react';
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
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-sm">
        <thead className="border-b bg-slate-50 text-left">
          <tr>
            <th className="px-4 py-3">E-mail</th>
            {showApproval ? <th className="px-4 py-3">Aprovacao</th> : null}
            <th className="px-4 py-3">Criado Em</th>
            <th className="px-4 py-3">ID</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b last:border-b-0">
              <td className="px-4 py-3">{user.email}</td>
              {showApproval ? (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={Boolean(togglingByUserID?.[user.id])}
                      onClick={() => onToggleApproval?.(user.id, !(user.is_approved ?? false))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        user.is_approved ? 'bg-green-600' : 'bg-slate-500'
                      } disabled:opacity-60`}
                      aria-label={user.is_approved ? 'Definir como pendente' : 'Aprovar influencer'}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          user.is_approved ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={user.is_approved ? 'text-green-700' : 'text-amber-700'}>{user.is_approved ? 'Aprovado' : 'Pendente'}</span>
                  </div>
                </td>
              ) : null}
              <td className="px-4 py-3">{new Date(user.created_at).toLocaleString('pt-BR')}</td>
              <td className="px-4 py-3 font-mono text-xs">{user.id}</td>
            </tr>
          ))}
          {!users.length ? (
            <tr>
              <td className="px-4 py-3 text-slate-500" colSpan={showApproval ? 4 : 3}>
                {emptyLabel}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
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

  useEffect(() => {
    setAuthRole(getTokenRole());
    setIsReady(true);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [authRole]);

  async function loadUsers() {
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
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await api.post('/auth/login', loginForm);
      const role = response?.data?.user?.role as string | undefined;
      if (role !== 'admin') {
        clearToken();
        setError('Esta conta nao e admin.');
        return;
      }

      setAuthSession(response.data.token, response.data.user);
      setAuthRole('admin');
      setMessage('Autenticado com sucesso.');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Falha no login');
    }
  }

  function handleLogout() {
    clearToken();
    setAuthRole(null);
    setUsers([]);
    setMessage('');
    setError('');
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
      <div className="mx-auto max-w-2xl rounded-lg border bg-white p-6">
        <h1 className="text-2xl font-semibold">Acesso Admin</h1>
        <p className="mt-2 text-slate-600">Entre com uma conta admin para acessar esta area.</p>
        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            type="email"
            placeholder="E-mail"
            value={loginForm.email}
            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            placeholder="Senha"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            required
          />
          <button className="rounded bg-brand px-4 py-2 text-white" type="submit">
            Entrar como Admin
          </button>
        </form>
        {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  const roleUsers = users.filter((user) => user.role === 'user');
  const influencers = users.filter((user) => user.role === 'influencer');
  const admins = users.filter((user) => user.role === 'admin');

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-600 p-6 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Administracao</h1>
            <p className="mt-2 text-white/90">Usuarios separados por perfil.</p>
          </div>
          <button className="rounded border border-white/40 px-4 py-2 text-white" type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Usuarios ({roleUsers.length})</h2>
        <UsersTable users={roleUsers} emptyLabel="Nenhum usuario encontrado." />
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Influencers ({influencers.length})</h2>
        <UsersTable
          users={influencers}
          emptyLabel="Nenhum influencer encontrado."
          showApproval
          onToggleApproval={handleToggleInfluencerApproval}
          togglingByUserID={togglingByUserID}
        />
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Admins ({admins.length})</h2>
        <UsersTable users={admins} emptyLabel="Nenhum admin encontrado." />
      </section>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
