import { useEffect, useState } from 'react';
import { api, type QueryMeta } from '../api';
import { Btn, Card, Field, inputCls, Msg, ResultGrid, type MsgState } from '../components/ui';

const ICONS: Record<string, string> = {
  never_traded: '🆕', top_spenders: '💸', history_count: '📚', holders_of_team: '🏟️',
  monthly_volume: '📅', volatile: '🎢', squad_over_budget: '⚖️', price_vs_position: '📐',
};

export default function InsightsScreen() {
  const [queries, setQueries] = useState<QueryMeta[]>([]);
  const [active, setActive] = useState<QueryMeta | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<any[] | null>(null);
  const [msg, setMsg] = useState<MsgState>({ text: '', type: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<QueryMeta[]>('/api/queries').then(setQueries).catch((e) => setMsg({ text: e.message, type: 'error' })); }, []);

  const pick = (q: QueryMeta) => {
    setActive(q);
    setParams(Object.fromEntries(q.params.map((p) => [p.name, p.default])));
    setRows(null);
    setMsg({ text: '', type: '' });
    if (q.params.length === 0) run(q, {});
  };

  const run = async (q: QueryMeta, p: Record<string, string>) => {
    setBusy(true); setMsg({ text: '', type: '' });
    try { setRows((await api<{ rows: any[] }>(`/api/queries/${q.id}`, { json: p })).rows); }
    catch (e: any) { setMsg({ text: e.message, type: 'error' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {queries.map((q) => (
          <button key={q.id} onClick={() => pick(q)}
            className={`text-right p-4 rounded-2xl border transition-all ${active?.id === q.id ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}>
            <div className="text-2xl mb-2">{ICONS[q.id] || '📊'}</div>
            <div className="font-bold text-sm">{q.label}</div>
            <div className="text-[11px] text-slate-400 mt-1 leading-snug">{q.description}</div>
          </button>
        ))}
      </div>

      {active && (
        <Card title={`${ICONS[active.id] || '📊'} ${active.label}`} subtitle={active.description}
          actions={active.params.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              {active.params.map((p) => (
                <Field key={p.name} label={p.label}>
                  <input className={`${inputCls} !w-44 !py-2`} type={p.type === 'date' ? 'date' : 'text'} value={params[p.name] ?? ''}
                    onChange={(e) => setParams((s) => ({ ...s, [p.name]: e.target.value }))} />
                </Field>
              ))}
              <Btn onClick={() => run(active, params)} disabled={busy}>הצג</Btn>
            </div>
          )}>
          <div className="px-4 pt-3"><Msg msg={msg} /></div>
          {rows ? <ResultGrid rows={rows} emptyText="לא נמצאו נתונים לתנאים שנבחרו" /> : <div className="py-10 text-center text-slate-500 text-sm">{busy ? 'מחשב...' : 'בחר פרמטרים ולחץ "הצג"'}</div>}
        </Card>
      )}
      {!active && <div className="text-center text-slate-500 text-sm py-6">בחר תובנה כדי לראות את הנתונים</div>}
    </div>
  );
}
