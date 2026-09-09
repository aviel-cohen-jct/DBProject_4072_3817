import { useEffect, useState } from 'react';
import { api, formatCurrency, type AppUser } from '../api';
import { Btn, Card, Field, inputCls, Msg, Stat, type MsgState } from '../components/ui';

export default function AccountScreen({ user, onUserUpdated, onLogout }: { user: AppUser; onUserUpdated: (u: AppUser) => void; onLogout: () => void }) {
  const [row, setRow] = useState<any>(null);
  const [name, setName] = useState(user.name);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [msg, setMsg] = useState<MsgState>({ text: '', type: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async () => {
    try {
      const [r, p] = await Promise.all([
        api(`/api/tables/users/row?user_id=${user.id}`),
        api('/api/programs/portfolio-value', { json: { userId: user.id } }),
      ]);
      setRow(r); setName(r.user_name); setPortfolio(p);
    } catch (e: any) { setMsg({ text: e.message, type: 'error' }); }
  };
  useEffect(() => { load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    try {
      const updated = await api('/api/tables/users', { method: 'PUT', json: { user_id: user.id, user_name: name.trim() } });
      setMsg({ text: 'שם המשתמש עודכן', type: 'success' });
      onUserUpdated({ id: user.id, name: updated.user_name });
      load();
    } catch (e: any) { setMsg({ text: e.message, type: 'error' }); }
  };

  const remove = async () => {
    try {
      await api(`/api/tables/users?user_id=${user.id}`, { method: 'DELETE' });
      onLogout();
    } catch (e: any) { setMsg({ text: e.message, type: 'error' }); setConfirmDelete(false); }
  };

  const y = portfolio ? parseFloat(portfolio.yield_percent) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card title="פרטי החשבון" subtitle="עריכת הפרופיל האישי שלך" className="lg:col-span-1">
        <div className="p-5 space-y-4">
          <Msg msg={msg} />
          <Field label="שם משתמש" required><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="מספר חשבון"><input className={inputCls} disabled value={row ? `#${row.user_id}` : ''} /></Field>
          <Btn className="w-full" onClick={save} disabled={!name.trim() || name === row?.user_name}>שמור שינויים</Btn>
          <div className="border-t border-slate-800 pt-4">
            {!confirmDelete ? (
              <Btn variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>מחיקת החשבון</Btn>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-rose-400 text-center font-bold">החשבון יימחק לצמיתות. חשבון עם עסקאות או סגל לא ניתן למחיקה.</p>
                <div className="flex gap-2">
                  <Btn variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>ביטול</Btn>
                  <Btn variant="danger" className="flex-1" onClick={remove}>כן, מחק</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card title="מצב החשבון" subtitle="מחושב ישירות בבסיס הנתונים (fn_calculate_portfolio_value)" className="lg:col-span-2"
        actions={<Btn variant="ghost" onClick={load}>רענן חישוב</Btn>}>
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
          <Stat label="תקציב התחלתי" value={row ? formatCurrency(row.initial_budget) : '—'} />
          <Stat label="יתרה פנויה" value={portfolio ? formatCurrency(portfolio.current_budget) : '—'} tone="text-emerald-400" />
          <Stat label="שווי הסגל" value={portfolio ? formatCurrency(portfolio.squad_value) : '—'} tone="text-teal-300" />
          <Stat label="סך הכל הון" value={portfolio ? formatCurrency(portfolio.total_value) : '—'} />
          <Stat label="תשואה כוללת" value={portfolio ? `${y >= 0 ? '+' : ''}${y.toFixed(2)}%` : '—'} tone={y >= 0 ? 'text-emerald-400' : 'text-rose-500'} />
          <Stat label="תשואה שמורה בפרופיל" value={row?.portfolio_yield != null ? `${row.portfolio_yield}%` : '—'} tone="text-slate-300" />
        </div>
        <p className="px-5 pb-5 text-[11px] text-slate-500">התשואה מחושבת כ-(הון כולל − תקציב התחלתי) / תקציב התחלתי, ונשמרת בפרופיל בכל חישוב.</p>
      </Card>
    </div>
  );
}
