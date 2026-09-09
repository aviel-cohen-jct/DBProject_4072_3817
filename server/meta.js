// Single source of truth for every table the GUI can manage.
// - pk: primary key columns (composite allowed)
// - autoPk: single integer PK that the server assigns as MAX+1 on insert
// - display: SQL expression (row alias is always `r`) used to show this row
//            by name wherever another table references it via FK
// - cols: name, Hebrew label, type (int|text|date|timestamp|numeric|enum),
//         enum values, fk (referenced table), required, hint

const c = (name, label, type, extra = {}) => ({ name, label, type, ...extra });

export const TABLES = {
  // ---------- our fantasy exchange system ----------
  users: {
    label: 'משתמשים', pk: ['user_id'], autoPk: true,
    display: 'r.user_name',
    cols: [
      c('user_id', 'מזהה', 'int'),
      c('user_name', 'שם משתמש', 'text', { required: true }),
      c('current_budget', 'תקציב נוכחי', 'int', { required: true, hint: 'חייב להיות 0 או יותר' }),
      c('initial_budget', 'תקציב התחלתי', 'int', { required: true }),
      c('portfolio_yield', 'תשואה (%)', 'numeric', { hint: 'מחושב ע"י fn_calculate_portfolio_value' }),
    ],
  },
  players: {
    label: 'שחקני בורסה', pk: ['player_id'], autoPk: true,
    display: "r.first_name || ' ' || r.last_name",
    cols: [
      c('player_id', 'מזהה', 'int'),
      c('first_name', 'שם פרטי', 'text', { required: true }),
      c('last_name', 'שם משפחה', 'text', { required: true }),
      c('position', 'עמדה', 'enum', { values: ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'], required: true }),
      c('team_name', 'קבוצה', 'text', { required: true }),
      c('current_price', 'מחיר נוכחי', 'int', { required: true, hint: '4,000 - 20,000. שינוי מחיר יוצר רשומת היסטוריה אוטומטית (טריגר)' }),
    ],
  },
  rounds: {
    label: 'מחזורים', pk: ['round_id'], autoPk: true,
    display: "'מחזור ' || r.round_number",
    cols: [
      c('round_id', 'מזהה', 'int'),
      c('round_number', 'מספר מחזור', 'int', { required: true, hint: '1 - 36' }),
      c('start_date', 'תאריך התחלה', 'timestamp', { required: true }),
      c('end_date', 'תאריך סיום', 'timestamp', { required: true, hint: 'חייב להיות אחרי תאריך ההתחלה' }),
      c('status', 'סטטוס', 'enum', { values: ['Upcoming', 'Active', 'Completed'], required: true }),
    ],
  },
  price_history: {
    label: 'היסטוריית מחירים', pk: ['history_id'], autoPk: true, orderDesc: true,
    cols: [
      c('history_id', 'מזהה', 'int'),
      c('player_id', 'שחקן', 'int', { fk: 'players', required: true }),
      c('round_id', 'מחזור', 'int', { fk: 'rounds', required: true }),
      c('recorded_price', 'מחיר שנרשם', 'int', { required: true, hint: '4,000 - 20,000' }),
    ],
  },
  transactions: {
    label: 'עסקאות', pk: ['transaction_id'], autoPk: true, orderDesc: true,
    cols: [
      c('transaction_id', 'מזהה', 'int'),
      c('transaction_time', 'זמן', 'timestamp', { required: true }),
      c('user_id', 'משתמש', 'int', { fk: 'users', required: true }),
      c('player_id', 'שחקן', 'int', { fk: 'players', required: true }),
      c('action_type', 'סוג פעולה', 'enum', { values: ['BUY', 'SELL'], required: true }),
      c('transaction_price', 'מחיר', 'int', { required: true, hint: 'נבדק ע"י טריגר: תקציב בקנייה, בעלות במכירה' }),
    ],
  },
  user_squads: {
    label: 'סגלי משתמשים', pk: ['squad_record_id'], autoPk: true,
    cols: [
      c('squad_record_id', 'מזהה', 'int'),
      c('user_id', 'משתמש', 'int', { fk: 'users', required: true }),
      c('player_id', 'שחקן', 'int', { fk: 'players', required: true }),
      c('lineup_status', 'מעמד בהרכב', 'enum', { values: ['Starter', 'Bench'], required: true }),
    ],
  },
  player_mapping: {
    label: 'קישור לשחקן אמיתי', pk: ['bursa_player_id', 'real_player_id'],
    cols: [
      c('bursa_player_id', 'שחקן בורסה', 'int', { fk: 'players', required: true }),
      c('real_player_id', 'שחקן אמיתי (ליגה)', 'int', { fk: 'player', required: true }),
    ],
  },

  // ---------- received real-world football system ----------
  player: {
    label: 'שחקנים (ליגה)', pk: ['playerid'], autoPk: true,
    display: 'r.playername',
    cols: [
      c('playerid', 'מזהה', 'int'),
      c('playername', 'שם', 'text', { required: true }),
      c('birthdate', 'תאריך לידה', 'date'),
      c('position', 'עמדה', 'text'),
      c('height', 'גובה (ס"מ)', 'int'),
      c('strongleg', 'רגל חזקה', 'enum', { values: ['Left', 'Right'] }),
      c('nativecountry', 'מדינה', 'text'),
    ],
  },
  goalkeeper: {
    label: 'שוערים', pk: ['playerid'],
    display: '(SELECT p.playername FROM player p WHERE p.playerid = r.playerid)',
    cols: [
      c('playerid', 'שחקן', 'int', { fk: 'player', required: true }),
      c('glovesnumber', 'מספר כפפות', 'int'),
    ],
  },
  coach: {
    label: 'מאמנים', pk: ['coachid'], autoPk: true,
    display: 'r.coachname',
    cols: [
      c('coachid', 'מזהה', 'int'),
      c('coachname', 'שם', 'text', { required: true }),
      c('gender', 'מגדר', 'text'),
      c('birthday', 'תאריך לידה', 'date'),
      c('prodate', 'תחילת קריירה', 'date'),
    ],
  },
  referee: {
    label: 'שופטים', pk: ['refereeid'], autoPk: true,
    display: 'r.refereename',
    cols: [
      c('refereeid', 'מזהה', 'int'),
      c('refereename', 'שם', 'text', { required: true }),
      c('gender', 'מגדר', 'text'),
      c('birthday', 'תאריך לידה', 'date'),
      c('prodate', 'תחילת קריירה', 'date'),
    ],
  },
  team: {
    label: 'קבוצות', pk: ['teamid'], autoPk: true,
    display: 'r.teamname',
    cols: [
      c('teamid', 'מזהה', 'int'),
      c('teamname', 'שם קבוצה', 'text', { required: true }),
      c('country', 'מדינה', 'text'),
      c('yearfounded', 'שנת ייסוד', 'int', { hint: 'בין 1801 לשנה הנוכחית' }),
    ],
  },
  stadium: {
    label: 'אצטדיונים', pk: ['stadiumid'], autoPk: true,
    display: 'r.stadiumname',
    cols: [
      c('stadiumid', 'מזהה', 'int'),
      c('stadiumname', 'שם אצטדיון', 'text', { required: true }),
      c('city', 'עיר', 'text'),
      c('capacity', 'קיבולת', 'int', { hint: 'גדול מ-0' }),
      c('yearfounded', 'שנת ייסוד', 'int'),
    ],
  },
  match: {
    label: 'משחקים', pk: ['matchid'], autoPk: true, displayLabel: 'משחק',
    display: "COALESCE((SELECT string_agg(t.teamname, ' - ' ORDER BY mt.role DESC) FROM matchteam mt JOIN team t ON t.teamid = mt.teamid WHERE mt.matchid = r.matchid), r.stage, 'משחק ' || r.matchid) || ' (' || to_char(r.matchdate, 'DD/MM/YYYY') || ')'",
    cols: [
      c('matchid', 'מזהה', 'int'),
      c('matchdate', 'תאריך', 'date', { required: true }),
      c('stage', 'שלב', 'text'),
    ],
  },
  matchteam: {
    label: 'קבוצות במשחק', pk: ['matchid', 'teamid'],
    cols: [
      c('matchid', 'משחק', 'int', { fk: 'match', required: true }),
      c('teamid', 'קבוצה', 'int', { fk: 'team', required: true }),
      c('role', 'בית/חוץ', 'enum', { values: ['Home', 'Away'] }),
      c('score', 'שערים', 'int'),
      c('winloss', 'תוצאה', 'text', { hint: 'Win / Loss / Draw' }),
    ],
  },
  matchstadium: {
    label: 'אצטדיון המשחק', pk: ['matchid'],
    cols: [
      c('matchid', 'משחק', 'int', { fk: 'match', required: true }),
      c('stadiumid', 'אצטדיון', 'int', { fk: 'stadium' }),
      c('attendees', 'צופים', 'int'),
    ],
  },
  refereeat: {
    label: 'שופטים במשחק', pk: ['matchid', 'refereeid'],
    cols: [
      c('matchid', 'משחק', 'int', { fk: 'match', required: true }),
      c('refereeid', 'שופט', 'int', { fk: 'referee', required: true }),
    ],
  },
  coachedby: {
    label: 'מאמני הקבוצה', pk: ['coachid', 'teamid'],
    cols: [
      c('coachid', 'מאמן', 'int', { fk: 'coach', required: true }),
      c('teamid', 'קבוצה', 'int', { fk: 'team', required: true }),
      c('startdate', 'תאריך התחלה', 'date'),
      c('salary', 'שכר', 'numeric'),
    ],
  },
  playsfor_player: {
    label: 'שחקני הקבוצה', pk: ['playerid', 'teamid'],
    cols: [
      c('playerid', 'שחקן', 'int', { fk: 'player', required: true }),
      c('teamid', 'קבוצה', 'int', { fk: 'team', required: true }),
      c('startdate', 'תאריך התחלה', 'date'),
      c('salary', 'שכר', 'numeric', { hint: 'לפחות 5,000' }),
    ],
  },
  playsfor_gk: {
    label: 'שוערי הקבוצה', pk: ['playerid', 'teamid'],
    cols: [
      c('playerid', 'שוער', 'int', { fk: 'goalkeeper', required: true }),
      c('teamid', 'קבוצה', 'int', { fk: 'team', required: true }),
      c('startdate', 'תאריך התחלה', 'date'),
      c('salary', 'שכר', 'numeric'),
    ],
  },
  playermatchstats: {
    label: 'סטטיסטיקת שחקנים במשחק', pk: ['playerid', 'matchid'],
    cols: [
      c('playerid', 'שחקן', 'int', { fk: 'player', required: true }),
      c('matchid', 'משחק', 'int', { fk: 'match', required: true }),
      c('goals', 'שערים', 'int'),
      c('assists', 'בישולים', 'int'),
      c('passcompleted', 'מסירות מדויקות', 'int'),
      c('passattempts', 'ניסיונות מסירה', 'int'),
      c('tackles', 'טאקלים', 'int'),
      c('yellowcard', 'צהובים', 'int'),
      c('redcard', 'אדומים', 'int'),
    ],
  },
  gkmatchstats: {
    label: 'סטטיסטיקת שוערים במשחק', pk: ['playerid', 'matchid'],
    cols: [
      c('playerid', 'שוער', 'int', { fk: 'goalkeeper', required: true }),
      c('matchid', 'משחק', 'int', { fk: 'match', required: true }),
      c('saves', 'הצלות', 'int'),
      c('goalsconceded', 'שערי חובה', 'int'),
      c('yellowcard', 'צהובים', 'int'),
      c('redcard', 'אדומים', 'int'),
    ],
  },
};

// What the client receives: everything except the SQL display expressions.
export const clientMeta = () =>
  Object.fromEntries(Object.entries(TABLES).map(([name, t]) => [name, {
    label: t.label, pk: t.pk, autoPk: !!t.autoPk, cols: t.cols, displayLabel: t.displayLabel || null,
  }]));
