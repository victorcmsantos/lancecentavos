export function formatCents(value: number): string {
  return `$${(value / 100).toFixed(2)}`;
}

export function parseReaisToCents(raw: string): number | null {
  const normalized = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}
