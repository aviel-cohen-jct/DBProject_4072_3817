import React, { useEffect, useRef, useState } from 'react';
import { api, formatCell } from '../api';

export type MsgState = { text: string; type: 'success' | 'error' | 'info' | '' };

export function Card({ title, subtitle, actions, children, className = '' }: {
  title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="p-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3">
          <div>
            {title && <h2 className="text-lg font-bold">{title}</h2>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Msg({ msg }: { msg: MsgState }) {
  if (!msg.text) return null;
  const cls = msg.type === 'success'
    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
    : msg.type === 'error' ? 'bg-rose-950/80 text-rose-400 border-rose-800' : 'bg-slate-800 text-slate-200 border-slate-700';
  return <div className={`p-3 rounded-xl text-sm font-bold text-center border whitespace-pre-line ${cls}`}>{msg.text}</div>;
}

export function Btn({ variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'subtle' }) {
  const base = 'px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const v = {
    primary: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
    ghost: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
    danger: 'bg-transparent hover:bg-rose-500/10 border border-rose-500/50 hover:border-rose-500 text-rose-400',
    subtle: 'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-100',
  }[variant];
  return <button className={`${base} ${v} ${className}`} {...props} />;
}

export const inputCls = 'w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors disabled:opacity-50';

export function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-400 block mb-1">{label}{required && <span className="text-rose-400"> *</span>}</span>
      {children}
      {hint && <span className="text-[10px] text-slate-500 block mt-1">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-slate-900 border border-slate-700 rounded-3xl w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} mt-10 shadow-2xl`}>
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl leading-none px-2">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// Searchable picker for foreign keys: shows names, stores the id.
export function FkPicker({ table, value, label, onChange, disabled, placeholder }: {
  table: string; value: any; label?: string; onChange: (value: any, label: string) => void; disabled?: boolean; placeholder?: string;
}) {
  const [text, setText] = useState(label || '');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<{ value: any; label: string }[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => { setText(label || ''); }, [label, value]);

  const search = (q: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try { setOptions(await api(`/api/tables/${table}/options?q=${encodeURIComponent(q)}`)); } catch { setOptions([]); }
    }, 200);
  };

  return (
    <div className="relative">
      <input
        className={inputCls}
        disabled={disabled}
        placeholder={placeholder || 'הקלד לחיפוש...'}
        value={text}
        onFocus={() => { setOpen(true); search(text); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setText(e.target.value); setOpen(true); search(e.target.value); if (!e.target.value) onChange(null, ''); }}
      />
      {value !== null && value !== undefined && value !== '' && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 font-bold">✓</span>
      )}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-xl">
          {options.length === 0 && <div className="px-3 py-2 text-xs text-slate-500">אין תוצאות</div>}
          {options.map((o) => (
            <button type="button" key={String(o.value)}
              className="w-full text-right px-3 py-2 text-sm hover:bg-slate-800 text-slate-200"
              onMouseDown={(e) => { e.preventDefault(); onChange(o.value, o.label); setText(o.label); setOpen(false); }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Generic read-only grid for query / program results (headers come from row keys)
export function ResultGrid({ rows, emptyText = 'אין תוצאות להצגה', maxHeight = 'max-h-[28rem]' }: { rows: any[]; emptyText?: string; maxHeight?: string }) {
  if (!rows || rows.length === 0) return <div className="py-10 text-center text-slate-500 text-sm">{emptyText}</div>;
  const keys = Object.keys(rows[0]);
  return (
    <div className={`overflow-auto ${maxHeight}`}>
      <table className="w-full text-right text-sm">
        <thead className="sticky top-0">
          <tr className="bg-slate-950 text-slate-400 text-xs border-b border-slate-800">
            {keys.map((k) => <th key={k} className="py-3 px-4 whitespace-nowrap font-bold">{k}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-800/40">
              {keys.map((k) => <td key={k} className="py-2.5 px-4 whitespace-nowrap text-slate-200">{formatCell(r[k])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Stat({ label, value, tone = 'text-slate-100' }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
      <span className="text-xs text-slate-400 block">{label}</span>
      <span className={`text-lg font-black ${tone}`}>{value}</span>
    </div>
  );
}
