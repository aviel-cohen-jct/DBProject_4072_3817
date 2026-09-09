import { useState } from 'react';
import { api } from '../api';
import EntityPanel from '../components/EntityPanel';
import { Btn, Card, Msg, ResultGrid, type MsgState } from '../components/ui';

export default function RoundsScreen() {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ notices: string[]; addedCount: number; rows: any[] } | null>(null);
  const [msg, setMsg] = useState<MsgState>({ text: '', type: '' });
  const [refresh, setRefresh] = useState(0);

  const closeRound = async () => {
    setBusy(true); setMsg({ text: '', type: '' }); setConfirm(false);
    try {
      const r = await api('/api/programs/round-update', { method: 'POST' });
      setResult(r);
      setMsg({ text: r.notices.join('\n') || 'המחזור נסגר', type: 'success' });
      setRefresh((x) => x + 1);
    } catch (e: any) { setMsg({ text: e.message, type: 'error' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <Card title="סגירת מחזור ועדכון מחירי השוק" subtitle="מריץ את prc_process_round_price_update: מחיר כל שחקן מתעדכן לפי ביצועיו בעולם האמיתי, והטריגר רושם את המחיר החדש בהיסטוריה"
        actions={!confirm
          ? <Btn onClick={() => setConfirm(true)} disabled={busy}>🔒 סגור מחזור ועדכן מחירים</Btn>
          : <div className="flex items-center gap-2">
              <span className="text-xs text-amber-300 font-bold">כל מחירי השחקנים ישתנו. להמשיך?</span>
              <Btn variant="ghost" onClick={() => setConfirm(false)}>ביטול</Btn>
              <Btn onClick={closeRound}>כן, סגור מחזור</Btn>
            </div>}>
        <div className="p-4 space-y-4">
          <Msg msg={msg} />
          {busy && <div className="text-center text-slate-400 text-sm">מעדכן מחירים...</div>}
          {result && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold">
                  {result.addedCount.toLocaleString('he-IL')} רשומות היסטוריית מחירים נוספו אוטומטית ע"י הטריגר
                </span>
              </div>
              <ResultGrid rows={result.rows} maxHeight="max-h-80" />
            </>
          )}
        </div>
      </Card>

      <EntityPanel table="rounds" title="מחזורי העונה" subtitle="36 מחזורים. מחזור במצב 'פעיל' הוא זה שאליו נרשמים מחירי השוק החדשים" refreshKey={refresh} />
    </div>
  );
}
