export type AuthUser = {
  id?: string;
  email?: string;
  role?: string;
  is_approved?: boolean;
  bid_credits?: number;
  bid_credits_value?: number;
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function parseTokenPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getTokenRole(): string | null {
  const token = getToken();
  if (!token) return null;

  const payload = parseTokenPayload(token);
  const role = payload?.role;

  return typeof role === 'string' ? role : null;
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem('auth_user');
  const token = getToken();
  const payload = token ? parseTokenPayload(token) : null;

  const tokenFallback: AuthUser = {
    id: typeof payload?.user_id === 'string' ? payload.user_id : undefined,
    role: typeof payload?.role === 'string' ? payload.role : undefined
  };

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        id:
          typeof parsed.id === 'string'
            ? parsed.id
            : typeof parsed.ID === 'string'
              ? parsed.ID
              : tokenFallback.id,
        email:
          typeof parsed.email === 'string'
            ? parsed.email
            : typeof parsed.Email === 'string'
              ? parsed.Email
              : undefined,
        role:
          typeof parsed.role === 'string'
            ? parsed.role
            : typeof parsed.Role === 'string'
              ? parsed.Role
              : tokenFallback.role,
        is_approved:
          typeof parsed.is_approved === 'boolean'
            ? parsed.is_approved
            : typeof parsed.IsApproved === 'boolean'
              ? parsed.IsApproved
              : undefined,
        bid_credits:
          typeof parsed.bid_credits === 'number'
            ? parsed.bid_credits
            : typeof parsed.BidCredits === 'number'
              ? parsed.BidCredits
              : undefined,
        bid_credits_value:
          typeof parsed.bid_credits_value === 'number'
            ? parsed.bid_credits_value
            : typeof parsed.BidCreditsValue === 'number'
              ? parsed.BidCreditsValue
              : undefined
      };
    } catch {
      localStorage.removeItem('auth_user');
    }
  }

  if (!token) return null;
  return tokenFallback;
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
}

export function setAuthSession(token: string, user?: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  }
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('auth_user');
}
