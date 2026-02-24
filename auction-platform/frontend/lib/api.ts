import axios from 'axios';

function resolveBrowserAPIBaseURL(): string {
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  return `${protocol}://${window.location.hostname}:8080/api/v1`;
}

function resolveConfiguredBrowserAPIBaseURL(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (!configured) return resolveBrowserAPIBaseURL();

  try {
    const parsed = new URL(configured);
    const currentHost = window.location.hostname.toLowerCase();
    const configuredHost = parsed.hostname.toLowerCase();
    const currentIsLocalhostFamily = currentHost === 'localhost' || currentHost.endsWith('.localhost');
    const configuredIsLocalhost = configuredHost === 'localhost';

    // If app is being accessed via subdomain/local network, avoid forcing localhost.
    if (configuredIsLocalhost && !currentIsLocalhostFamily) {
      return resolveBrowserAPIBaseURL();
    }
    return configured;
  } catch {
    return resolveBrowserAPIBaseURL();
  }
}

const baseURL =
  typeof window === 'undefined'
    ? process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://backend:8080/api/v1'
    : resolveConfiguredBrowserAPIBaseURL();

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

function toSnakeCase(key: string): string {
  let out = '';
  for (let i = 0; i < key.length; i += 1) {
    const ch = key[i];
    const prev = i > 0 ? key[i - 1] : '';
    const next = i < key.length - 1 ? key[i + 1] : '';
    const isUpper = ch >= 'A' && ch <= 'Z';
    const prevIsLowerOrDigit = (prev >= 'a' && prev <= 'z') || (prev >= '0' && prev <= '9');
    const prevIsUpper = prev >= 'A' && prev <= 'Z';
    const nextIsLower = next >= 'a' && next <= 'z';

    const isAcronymPluralTail = next === 's' && i === key.length - 2;
    if (isUpper && i > 0 && prev !== '_' && (prevIsLowerOrDigit || (prevIsUpper && nextIsLower && !isAcronymPluralTail))) {
      out += '_';
    }
    out += isUpper ? ch.toLowerCase() : ch;
  }
  return out;
}

function normalizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeKeys(item));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const [key, innerValue] of Object.entries(record)) {
      normalized[toSnakeCase(key)] = normalizeKeys(innerValue);
    }
    return normalized;
  }

  return value;
}

api.interceptors.response.use((response) => {
  response.data = normalizeKeys(response.data);
  return response;
});

export function authHeaders(token?: string): Record<string, string> {
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`
  };
}
