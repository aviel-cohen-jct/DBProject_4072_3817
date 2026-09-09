import { useState } from 'react';
import EntityPanel from '../components/EntityPanel';
import { Btn } from '../components/ui';
import { Logo } from '../screens/LoginScreen';
import RoundsScreen from './RoundsScreen';

type Row = Record<string, any> | null;

const SECTIONS = [
  { id: 'rounds', icon: '🗓️', label: 'מחזורים' },
  { id: 'players', icon: '📈', label: 'שחקני בורסה' },
  { id: 'users', icon: '👥', label: 'משתמשים' },
  { id: 'transactions', icon: '🧾', label: 'יומן עסקאות' },
  { id: 'teams', icon: '🏟️', label: 'קבוצות ואצטדיונים' },
  { id: 'league_players', icon: '⚽', label: 'שחקנים ושוערים' },
  { id: 'staff', icon: '🎽', label: 'מאמנים ושופטים' },
  { id: 'matches', icon: '🏆', label: 'משחקים' },
];

export default function AdminApp({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState('rounds');
  const [player, setPlayer] = useState<Row>(null);
  const [user, setUser] = useState<Row>(null);
  const [team, setTeam] = useState<Row>(null);
  const [match, setMatch] = useState<Row>(null);
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const detailNote = (what: string) => <div className="text-center text-slate-500 text-sm py-4 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">בחר {what} מהרשימה כדי לנהל את הפרטים המקושרים אליו</div>;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-[1500px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Logo small />
          <div className="flex items-center gap-3">
            <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-full font-bold">🛠️ מנהל ליגה</span>
            <Btn variant="subtle" onClick={onLogout}>יציאה</Btn>
          </div>
        </div>
      </header>

      <div className="max-w-[1500px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <aside className="bg-slate-900 border border-slate-800 rounded-2xl p-2 h-fit lg:sticky lg:top-20">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`w-full text-right px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${section === s.id ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'}`}>
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </aside>

        <main className="space-y-6 min-w-0">
          {section === 'rounds' && <RoundsScreen />}

          {section === 'players' && (
            <>
              <EntityPanel table="players" title="שחקני הבורסה" subtitle="לחץ על שחקן כדי לנהל את הקישור לשחקן האמיתי ואת היסטוריית המחירים שלו. שינוי מחיר יוצר רשומת היסטוריה אוטומטית (טריגר)."
                selectable onRowSelect={setPlayer} onChanged={bump} />
              {player ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <EntityPanel table="player_mapping" title={`קישור לשחקן אמיתי: ${player.first_name} ${player.last_name}`} subtitle="השחקן בליגה האמיתית שממנו נגזרים הביצועים והמחיר"
                    filter={{ bursa_player_id: player.player_id }} pageSize={5} refreshKey={tick} />
                  <EntityPanel table="price_history" title={`היסטוריית מחירים: ${player.first_name} ${player.last_name}`} subtitle="רשומות המחיר לפי מחזור"
                    filter={{ player_id: player.player_id }} pageSize={10} refreshKey={tick} />
                </div>
              ) : detailNote('שחקן')}
            </>
          )}

          {section === 'users' && (
            <>
              <EntityPanel table="users" title="משתמשי הבורסה" subtitle="לחץ על משתמש כדי לראות את הסגל והעסקאות שלו" selectable onRowSelect={setUser} onChanged={bump} />
              {user ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <EntityPanel table="user_squads" title={`הסגל של ${user.user_name}`} filter={{ user_id: user.user_id }} pageSize={10} refreshKey={tick} />
                  <EntityPanel table="transactions" title={`העסקאות של ${user.user_name}`} subtitle="הוספת עסקה נבדקת ע״י טריגר: תקציב בקנייה, בעלות במכירה" filter={{ user_id: user.user_id }} pageSize={10} refreshKey={tick} />
                </div>
              ) : detailNote('משתמש')}
            </>
          )}

          {section === 'transactions' && (
            <EntityPanel table="transactions" title="יומן העסקאות של הבורסה" subtitle="כל הקניות והמכירות. הוספת עסקה נבדקת ע״י טריגר trg_transactions_validate" pageSize={30} />
          )}

          {section === 'teams' && (
            <>
              <EntityPanel table="team" title="קבוצות הליגה" subtitle="לחץ על קבוצה כדי לנהל את הסגל והצוות שלה" selectable onRowSelect={setTeam} />
              {team ? (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <EntityPanel table="coachedby" title={`מאמנים: ${team.teamname}`} filter={{ teamid: team.teamid }} pageSize={10} />
                  <EntityPanel table="playsfor_player" title={`שחקנים: ${team.teamname}`} filter={{ teamid: team.teamid }} pageSize={10} />
                  <EntityPanel table="playsfor_gk" title={`שוערים: ${team.teamname}`} filter={{ teamid: team.teamid }} pageSize={10} emptyText="אין שוערים רשומים לקבוצה. הוסף שוער בעמוד 'שחקנים ושוערים' ואז שייך אותו כאן." />
                </div>
              ) : detailNote('קבוצה')}
              <EntityPanel table="stadium" title="אצטדיונים" />
            </>
          )}

          {section === 'league_players' && (
            <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6">
              <EntityPanel table="player" title="שחקני הליגה האמיתית" subtitle="הביצועים שלהם במשחקים קובעים את מחירי הבורסה" />
              <EntityPanel table="goalkeeper" title="שוערים" subtitle="שחקן שמוגדר גם כשוער (מספר כפפות). שוער יכול לקבל סטטיסטיקת שוער במשחקים." emptyText="עדיין לא הוגדרו שוערים. לחץ 'הוספה' ובחר שחקן." />
            </div>
          )}

          {section === 'staff' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <EntityPanel table="coach" title="מאמנים" />
              <EntityPanel table="referee" title="שופטים" />
            </div>
          )}

          {section === 'matches' && (
            <>
              <EntityPanel table="match" title="משחקי הליגה" subtitle="לחץ על משחק כדי לנהל קבוצות, תוצאה, אצטדיון, שופטים וסטטיסטיקות" selectable onRowSelect={setMatch} onChanged={bump} />
              {match ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="xl:col-span-2 text-sm font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-4 py-2">🏆 {match.__display}</div>
                  <EntityPanel table="matchteam" title="קבוצות ותוצאה" filter={{ matchid: match.matchid }} pageSize={5} refreshKey={tick} onChanged={bump} />
                  <EntityPanel table="matchstadium" title="אצטדיון וקהל" filter={{ matchid: match.matchid }} pageSize={5} refreshKey={tick} />
                  <EntityPanel table="refereeat" title="שופטי המשחק" filter={{ matchid: match.matchid }} pageSize={5} refreshKey={tick} />
                  <EntityPanel table="playermatchstats" title="סטטיסטיקת שחקנים" filter={{ matchid: match.matchid }} pageSize={10} refreshKey={tick} />
                  <EntityPanel table="gkmatchstats" title="סטטיסטיקת שוערים" filter={{ matchid: match.matchid }} pageSize={5} refreshKey={tick} emptyText="אין סטטיסטיקת שוערים למשחק זה" />
                </div>
              ) : detailNote('משחק')}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
