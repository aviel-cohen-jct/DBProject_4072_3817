// Small fetch wrapper + shared types for the Stage E screens.

export type ColMeta = {
  name: string;
  label: string;
  type: 'int' | 'text' | 'date' | 'timestamp' | 'numeric' | 'enum';
  values?: string[];
  fk?: string;
  required?: boolean;
  hint?: string;
};

export type TableMeta = { label: string; pk: string[]; autoPk: boolean; cols: ColMeta[]; displayLabel: string | null };
export type Meta = Record<string, TableMeta>;

export type QueryMeta = {
  id: string;
  label: string;
  description: string;
  params: { name: string; label: string; type: string; default: string }[];
};

export type AppUser = { id: number; name: string };

export async function api<T = any>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const opts: RequestInit = { ...init };
  if (init?.json !== undefined) {
    opts.method = opts.method || 'POST';
    opts.headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
    opts.body = JSON.stringify(init.json);
  }
  const res = await fetch(path, opts);
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!res.ok) throw new Error(data?.error || `שגיאת שרת (${res.status})`);
  return data as T;
}

let metaPromise: Promise<Meta> | null = null;
export const getMeta = () => (metaPromise ??= api<Meta>('/api/meta'));

// Hebrew display for enum values coming from the DB
export const ENUM_LABELS: Record<string, string> = {
  Goalkeeper: 'שוער', Defender: 'מגן', Midfielder: 'קשר', Attacker: 'חלוץ',
  Upcoming: 'עתידי', Active: 'פעיל', Completed: 'הסתיים',
  BUY: 'קנייה', SELL: 'מכירה',
  Starter: 'הרכב פותח', Bench: 'ספסל',
  Left: 'שמאל', Right: 'ימין',
  Home: 'בית', Away: 'חוץ',
};
export const enumLabel = (v: unknown) => (typeof v === 'string' && ENUM_LABELS[v]) || String(v ?? '');

export const formatCurrency = (val: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);

export const formatCell = (v: unknown): string => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return v.toLocaleString('he-IL');
  if (typeof v === 'string') {
    if (/^-?\d+$/.test(v)) return Number(v).toLocaleString('he-IL');
    if (/^-?\d+\.\d+$/.test(v)) return Number(v).toLocaleString('he-IL', { maximumFractionDigits: 2 });
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return v.slice(0, 16).replace('T', ' ');
    return enumLabel(v);
  }
  return String(v);
};
