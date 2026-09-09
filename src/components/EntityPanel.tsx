import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, enumLabel, formatCell, getMeta, type ColMeta, type TableMeta } from '../api';
import { Btn, Card, Field, FkPicker, inputCls, Modal, Msg, type MsgState } from './ui';

type Row = Record<string, any>;
type Mode = 'insert' | 'update' | 'delete';

export type EntityPanelProps = {
  table: string;
  title?: string;
  subtitle?: string;
  filter?: Record<string, any>;        // fixed column values (master-detail)
  hidden?: string[];                    // columns not shown in the grid / locked in forms
  onRowSelect?: (row: Row | null) => void;
  selectable?: boolean;
  pageSize?: number;
  refreshKey?: unknown;
  onChanged?: () => void;
  emptyText?: string;
};

const pkKey = (t: TableMeta, row: Row) => t.pk.map((k) => String(row[k])).join('|');

const toInputValue = (col: ColMeta, v: any) => {
  if (v === null || v === undefined) return '';
  if (col.type === 'timestamp') return String(v).replace(' ', 'T').slice(0, 16);
  if (col.type === 'date') return String(v).slice(0, 10);
  return String(v);
};

export default function EntityPanel({ table, title, subtitle, filter, hidden = [], onRowSelect, selectable, pageSize = 25, refreshKey, onChanged, emptyText }: EntityPanelProps) {
  const [meta, setMeta] = useState<TableMeta | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<MsgState>({ text: '', type: '' });
  const [form, setForm] = useState<{ mode: Mode; row?: Row } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const filterKey = JSON.stringify(filter || {});
  const hiddenCols = useMemo(() => new Set([...hidden, ...Object.keys(filter || {})]), [hidden, filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { getMeta().then((m) => setMeta(m[table])); }, [table]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(pageSize), offset: String(page * pageSize) });
      if (q) params.set('q', q);
      Object.entries(filter || {}).forEach(([k, v]) => params.set(`f_${k}`, String(v)));
      const data = await api<{ rows: Row[]; total: number }>(`/api/tables/${table}?${params}`);
      setRows(data.rows);
      setTotal(data.total);
    } catch (e: any) { setMsg({ text: e.message, type: 'error' }); }
    finally { setLoading(false); }
  }, [table, page, q, filterKey, pageSize, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); setSelected(null); onRowSelect?.(null); }, [filterKey, table]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (text: string, type: MsgState['type']) => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 4000); };

  const afterChange = (text: string) => { setForm(null); flash(text, 'success'); load(); onChanged?.(); };

  if (!meta) return <Card title={title}><div className="p-6 text-slate-500 text-sm">טוען...</div></Card>;

  const visibleCols = meta.cols.filter((c) => !hiddenCols.has(c.name));
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card
      title={title ?? meta.label}
      subtitle={subtitle}
      actions={<>
        <input className={`${inputCls} !w-48 !py-2`} placeholder="חיפוש..." value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <Btn onClick={() => setForm({ mode: 'insert' })}>+ הוספה</Btn>
        <Btn variant="ghost" onClick={() => setForm({ mode: 'update' })}>עדכון לפי מפתח</Btn>
        <Btn variant="danger" onClick={() => setForm({ mode: 'delete' })}>מחיקה לפי מפתח</Btn>
      </>}
    >
      <div className="px-4 pt-3"><Msg msg={msg} /></div>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="bg-slate-950/60 text-slate-400 text-xs border-b border-slate-800">
              {meta.displayLabel && <th className="py-3 px-4 whitespace-nowrap">{meta.displayLabel}</th>}
              {visibleCols.map((c) => <th key={c.name} className="py-3 px-4 whitespace-nowrap">{meta.pk.includes(c.name) && !c.fk ? '#' : c.label}</th>)}
              <th className="py-3 px-4 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 && (
              <tr><td colSpan={visibleCols.length + (meta.displayLabel ? 2 : 1)} className="py-10 text-center text-slate-500">{loading ? 'טוען...' : (emptyText || 'אין רשומות להצגה')}</td></tr>
            )}
            {rows.map((r) => {
              const key = pkKey(meta, r);
              const isSel = selectable && selected === key;
              return (
                <tr key={key}
                  className={`transition-colors ${selectable ? 'cursor-pointer' : ''} ${isSel ? 'bg-emerald-500/10' : 'hover:bg-slate-800/40'}`}
                  onClick={() => { if (!selectable) return; setSelected(key); onRowSelect?.(r); }}>
                  {meta.displayLabel && <td className="py-2.5 px-4 whitespace-nowrap font-semibold text-slate-100">{r.__display}</td>}
                  {visibleCols.map((c) => (
                    <td key={c.name} className={`py-2.5 px-4 whitespace-nowrap ${meta.pk.includes(c.name) && !c.fk ? 'text-slate-500 text-xs' : 'text-slate-200'}`}>
                      {c.fk ? (r[`${c.name}__label`] ?? <span className="text-slate-500">—</span>) : c.type === 'enum' ? enumLabel(r[c.name]) : formatCell(r[c.name])}
                    </td>
                  ))}
                  <td className="py-2.5 px-4 text-center whitespace-nowrap">
                    <button className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 ml-1" onClick={(e) => { e.stopPropagation(); setForm({ mode: 'update', row: r }); }}>עריכה</button>
                    <button className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-rose-500 hover:text-slate-950" onClick={(e) => { e.stopPropagation(); setForm({ mode: 'delete', row: r }); }}>מחיקה</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
        <span>{total.toLocaleString('he-IL')} רשומות</span>
        <div className="flex items-center gap-2">
          <Btn variant="subtle" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ הקודם</Btn>
          <span>עמוד {page + 1} מתוך {pages}</span>
          <Btn variant="subtle" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>הבא ›</Btn>
        </div>
      </div>

      {form && (
        <RecordForm table={table} meta={meta} mode={form.mode} initialRow={form.row} filter={filter} hidden={hiddenCols}
          onClose={() => setForm(null)}
          onDone={afterChange} />
      )}
    </Card>
  );
}

// ---------------- Record form: insert / update-by-key / delete-by-key ----------------
function RecordForm({ table, meta, mode, initialRow, filter, hidden, onClose, onDone }: {
  table: string; meta: TableMeta; mode: Mode; initialRow?: Row; filter?: Record<string, any>; hidden: Set<string>;
  onClose: () => void; onDone: (text: string) => void;
}) {
  const [step, setStep] = useState<'key' | 'edit'>(mode === 'insert' || initialRow ? 'edit' : 'key');
  const [values, setValues] = useState<Row>(() => ({ ...(filter || {}), ...(initialRow || {}) }));
  const [labels, setLabels] = useState<Row>(() => {
    const l: Row = {};
    Object.keys(initialRow || {}).forEach((k) => { if (k.endsWith('__label')) l[k.replace('__label', '')] = initialRow![k]; });
    return l;
  });
  const [msg, setMsg] = useState<MsgState>({ text: '', type: '' });
  const [busy, setBusy] = useState(false);

  // labels for filter (parent) values
  useEffect(() => {
    Object.entries(filter || {}).forEach(async ([k, v]) => {
      const col = meta.cols.find((c) => c.name === k);
      if (!col?.fk || labels[k]) return;
      try {
        const opts = await api<{ value: any; label: string }[]>(`/api/tables/${col.fk}/options?q=${encodeURIComponent(String(v))}&limit=50`);
        const hit = opts.find((o) => String(o.value) === String(v));
        if (hit) setLabels((l) => ({ ...l, [k]: hit.label }));
      } catch { /* ignore */ }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (name: string, v: any, label?: string) => {
    setValues((s) => ({ ...s, [name]: v }));
    if (label !== undefined) setLabels((l) => ({ ...l, [name]: label }));
  };

  const pkParams = () => new URLSearchParams(meta.pk.map((k) => [k, String(values[k] ?? '')]));

  const loadByKey = async () => {
    setBusy(true); setMsg({ text: '', type: '' });
    try {
      const row = await api<Row>(`/api/tables/${table}/row?${pkParams()}`);
      const l: Row = {};
      Object.keys(row).forEach((k) => { if (k.endsWith('__label')) l[k.replace('__label', '')] = row[k]; });
      setValues({ ...row });
      setLabels((old) => ({ ...old, ...l }));
      setStep('edit');
    } catch (e: any) { setMsg({ text: e.message, type: 'error' }); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    setBusy(true); setMsg({ text: '', type: '' });
    try {
      const body: Row = {};
      meta.cols.forEach((c) => { body[c.name] = values[c.name] ?? null; });
      if (mode === 'insert') { await api(`/api/tables/${table}`, { json: body }); onDone('הרשומה נוספה בהצלחה'); }
      else if (mode === 'update') { await api(`/api/tables/${table}`, { method: 'PUT', json: body }); onDone('הרשומה עודכנה בהצלחה'); }
      else { await api(`/api/tables/${table}?${pkParams()}`, { method: 'DELETE' }); onDone('הרשומה נמחקה'); }
    } catch (e: any) { setMsg({ text: e.message, type: 'error' }); }
    finally { setBusy(false); }
  };

  const titles: Record<Mode, string> = { insert: `הוספת רשומה: ${meta.label}`, update: `עדכון רשומה: ${meta.label}`, delete: `מחיקת רשומה: ${meta.label}` };

  const renderInput = (col: ColMeta, disabled: boolean) => {
    const v = values[col.name];
    if (col.fk) return <FkPicker table={col.fk} value={v} label={labels[col.name]} disabled={disabled} onChange={(val, lab) => set(col.name, val, lab)} />;
    if (col.type === 'enum') return (
      <select className={inputCls} disabled={disabled} value={v ?? ''} onChange={(e) => set(col.name, e.target.value)}>
        <option value="">— בחר —</option>
        {col.values!.map((o) => <option key={o} value={o}>{enumLabel(o)}</option>)}
      </select>
    );
    const type = col.type === 'int' || col.type === 'numeric' ? 'number' : col.type === 'date' ? 'date' : col.type === 'timestamp' ? 'datetime-local' : 'text';
    return <input className={inputCls} type={type} step={col.type === 'numeric' ? '0.01' : undefined} disabled={disabled}
      value={toInputValue(col, v)} onChange={(e) => set(col.name, e.target.value)} />;
  };

  const isPk = (c: ColMeta) => meta.pk.includes(c.name);

  return (
    <Modal title={titles[mode]} onClose={onClose}>
      <div className="space-y-4">
        <Msg msg={msg} />
        {step === 'key' ? (
          <>
            <p className="text-xs text-slate-400">הזן את המפתח של הרשומה. המערכת תטען את שאר השדות.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {meta.cols.filter(isPk).map((c) => (
                <Field key={c.name} label={c.label} required>{renderInput(c, hidden.has(c.name) && c.name in (filter || {}))}</Field>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={onClose}>ביטול</Btn>
              <Btn onClick={loadByKey} disabled={busy}>טען רשומה</Btn>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {meta.cols.map((c) => {
                const pk = isPk(c);
                if (mode === 'insert' && pk && meta.autoPk) return (
                  <Field key={c.name} label={c.label}><input className={inputCls} disabled value="יוקצה אוטומטית" /></Field>
                );
                const locked = mode === 'delete' || (pk && mode === 'update') || (c.name in (filter || {}));
                return <Field key={c.name} label={c.label} hint={mode === 'delete' ? undefined : c.hint} required={c.required && mode === 'insert'}>{renderInput(c, locked)}</Field>;
              })}
            </div>
            {mode === 'delete' && <p className="text-sm text-rose-400 font-bold text-center">האם למחוק את הרשומה הזו? הפעולה אינה הפיכה.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={onClose}>ביטול</Btn>
              <Btn variant={mode === 'delete' ? 'danger' : 'primary'} onClick={submit} disabled={busy}>
                {mode === 'insert' ? 'הוסף' : mode === 'update' ? 'שמור שינויים' : 'מחק'}
              </Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
