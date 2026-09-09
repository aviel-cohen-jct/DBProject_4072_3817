import { useEffect, useState } from 'react';
import { api, type AppUser } from '../api';
import { Btn, Field, inputCls, Msg, type MsgState } from '../components/ui';

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl shadow-lg shadow-emerald-500/10 ${small ? 'p-2' : 'p-2.5'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className={`${small ? 'w-6 h-6' : 'w-7 h-7'} text-slate-950`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
        </svg>
      </div>
      <div>
        <h1 className={`${small ? 'text-xl' : 'text-2xl'} font-black bg-gradient-to-l from-emerald-400 to-teal-200 bg-clip-text text-transparent`}>ספורטקס</h1>
        <p className="text-xs text-slate-400 font-medium tracking-wide">בורסת שחקני הכדורגל הראשונה בישראל</p>
      </div>
    </div>
  );
}

export default function LoginScreen({ onTrader, onAdmin }: { onTrader: (u: AppUser) => void; onAdmin: () => void }) {
  const [users, setUsers] = useState<{ id: number; name: string; balance: number }[]>([]);
  const [userId, setUserId] = useState<number | ''>('');
  const [register, setRegister] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBudget, setNewBudget] = useState('100000');
  const [msg, setMsg] = useState<MsgState>({ text: '', type: '' });
  const [busy, setBusy] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await api<any[]>('/api/users');
      setUsers(data);
      if (data.length && userId === '') setUserId(data[0].id);
    } catch (e: any) { setMsg({ text: 'לא ניתן להתחבר לשרת: ' + e.message, type: 'error' }); }
  };
  useEffect(() => { loadUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enter = () => {
    const u = users.find((x) => x.id === userId);
    if (u) onTrader({ id: u.id, name: u.name });
  };

  const doRegister = async () => {
    setBusy(true); setMsg({ text: '', type: '' });
    try {
      const b = parseInt(newBudget, 10) || 0;
      const row = await api<any>('/api/tables/users', { json: { user_name: newName.trim(), current_budget: b, initial_budget: b } });
      onTrader({ id: row.user_id, name: row.user_name });
    } catch (e: any) { setMsg({ text: e.message, type: 'error' }); }
    finally { setBusy(false); }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center space-y-3">
        <div className="flex justify-center"><Logo /></div>
        <p className="text-sm text-slate-400 max-w-md">קנו ומכרו שחקנים כמו מניות. המחירים מתעדכנים בכל מחזור לפי הביצועים בעולם האמיתי.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {/* Trader */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div>
            <h2 className="text-xl font-black">כניסת סוחר</h2>
            <p className="text-xs text-slate-400">התחבר לחשבון המסחר שלך בבורסה</p>
          </div>
          <Msg msg={msg} />
          {!register ? (
            <>
              <Field label="בחר משתמש">
                <select className={inputCls} value={userId} onChange={(e) => setUserId(parseInt(e.target.value, 10))}>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
              <Btn className="w-full !py-3 !text-sm" onClick={enter} disabled={userId === ''}>כניסה לבורסה</Btn>
              <button className="w-full text-xs text-slate-400 hover:text-emerald-400" onClick={() => setRegister(true)}>משתמש חדש? הרשמה</button>
            </>
          ) : (
            <>
              <Field label="שם משתמש" required><input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} /></Field>
              <Field label="תקציב התחלתי" hint="ברירת המחדל בליגה: 100,000 ₪"><input className={inputCls} type="number" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} /></Field>
              <Btn className="w-full !py-3 !text-sm" onClick={doRegister} disabled={busy || !newName.trim()}>צור חשבון והיכנס</Btn>
              <button className="w-full text-xs text-slate-400 hover:text-emerald-400" onClick={() => setRegister(false)}>יש לי כבר חשבון</button>
            </>
          )}
        </div>

        {/* Admin */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-xl font-black">מנהל ליגה</h2>
            <p className="text-xs text-slate-400 mt-1">ניהול מחזורים, שחקנים, קבוצות, משחקים וסטטיסטיקות, סגירת מחזור ועדכון מחירי השוק.</p>
          </div>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc pr-4">
            <li>מחזורים וסגירת מחזור</li>
            <li>שחקני בורסה, משתמשים ועסקאות</li>
            <li>ליגה אמיתית: קבוצות, שחקנים, מאמנים, שופטים, משחקים</li>
          </ul>
          <Btn variant="ghost" className="w-full !py-3 !text-sm" onClick={onAdmin}>כניסה כמנהל ליגה</Btn>
        </div>
      </div>
    </div>
  );
}
