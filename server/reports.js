// Stage B queries (as user-facing "insights") and Stage D routines (functions/procedures).
import { Router } from 'express';
import { friendlyPgError } from './crud.js';

// ---- Stage B SELECT queries (DBProject_4072_3817/שלב ב/Queries.sql), ID columns removed ----
export const QUERIES = [
  {
    id: 'never_traded', label: 'שחקנים שטרם נסחרו',
    description: 'שחקנים שאף משתמש מעולם לא קנה (שאילתה 1, גרסת NOT EXISTS)',
    params: [],
    sql: `SELECT p.First_Name AS "שם פרטי", p.Last_Name AS "שם משפחה", p.Team_Name AS "קבוצה", p.Current_Price AS "מחיר נוכחי"
          FROM PLAYERS p
          WHERE NOT EXISTS (SELECT 1 FROM TRANSACTIONS t WHERE t.Player_ID = p.Player_ID AND t.Action_Type = 'BUY')
          ORDER BY p.Current_Price DESC`,
  },
  {
    id: 'top_spenders', label: 'המשקיעים הגדולים',
    description: 'חמשת המשתמשים שהוציאו הכי הרבה על קניות מאז תאריך נתון (שאילתה 2)',
    params: [{ name: 'since', label: 'מתאריך', type: 'date', default: '2026-01-01' }],
    sql: `SELECT u.User_Name AS "משתמש", SUM(t.Transaction_Price) AS "סך הכל הוצאה"
          FROM USERS u JOIN TRANSACTIONS t ON u.User_ID = t.User_ID
          WHERE t.Action_Type = 'BUY' AND t.Transaction_Time >= $1::timestamp
          GROUP BY u.User_ID, u.User_Name ORDER BY 2 DESC LIMIT 5`,
  },
  {
    id: 'history_count', label: 'עומק היסטוריית המחירים',
    description: 'עשרת השחקנים עם הכי הרבה רשומות היסטוריית מחירים (שאילתה 3)',
    params: [],
    sql: `SELECT p.First_Name || ' ' || p.Last_Name AS "שחקן", COUNT(ph.History_ID) AS "רשומות היסטוריה"
          FROM PLAYERS p LEFT JOIN PRICE_HISTORY ph ON p.Player_ID = ph.Player_ID
          GROUP BY p.Player_ID, p.First_Name, p.Last_Name ORDER BY 2 DESC LIMIT 10`,
  },
  {
    id: 'holders_of_team', label: 'מי מחזיק שחקנים של קבוצה',
    description: 'משתמשים שבסגל שלהם לפחות שחקן אחד מקבוצה נתונה (שאילתה 4, גרסת EXISTS)',
    params: [{ name: 'team', label: 'שם קבוצה', type: 'text', default: 'Reggio Calabria' }],
    sql: `SELECT u.User_Name AS "משתמש", u.Current_Budget AS "תקציב פנוי"
          FROM USERS u
          WHERE EXISTS (SELECT 1 FROM USER_SQUADS us JOIN PLAYERS p ON us.Player_ID = p.Player_ID
                        WHERE us.User_ID = u.User_ID AND p.Team_Name = $1)
          ORDER BY u.User_Name`,
  },
  {
    id: 'monthly_volume', label: 'נפח מסחר חודשי',
    description: 'כמות עסקאות, סכומי קנייה/מכירה ומחיר ממוצע לכל חודש (שאילתה 5)',
    params: [],
    sql: `SELECT EXTRACT(YEAR FROM Transaction_Time)::int AS "שנה", EXTRACT(MONTH FROM Transaction_Time)::int AS "חודש",
                 COUNT(Transaction_ID) AS "עסקאות",
                 SUM(CASE WHEN Action_Type = 'BUY' THEN Transaction_Price ELSE 0 END) AS "סך הכל קניות",
                 SUM(CASE WHEN Action_Type = 'SELL' THEN Transaction_Price ELSE 0 END) AS "סך הכל מכירות",
                 AVG(Transaction_Price)::NUMERIC(10,2) AS "מחיר ממוצע"
          FROM TRANSACTIONS
          GROUP BY 1, 2 ORDER BY 1 DESC, 2 DESC`,
  },
  {
    id: 'volatile', label: 'השחקנים התנודתיים ביותר',
    description: 'חמשת השחקנים עם ההפרש הגדול ביותר בין המחיר הגבוה לנמוך (שאילתה 6)',
    params: [],
    sql: `SELECT p.First_Name || ' ' || p.Last_Name AS "שחקן", p.Team_Name AS "קבוצה", p.Position AS "עמדה",
                 MAX(ph.Recorded_Price) AS "מחיר שיא", MIN(ph.Recorded_Price) AS "מחיר שפל",
                 MAX(ph.Recorded_Price) - MIN(ph.Recorded_Price) AS "תנודתיות"
          FROM PLAYERS p JOIN PRICE_HISTORY ph ON p.Player_ID = ph.Player_ID
          GROUP BY p.Player_ID, p.First_Name, p.Last_Name, p.Team_Name, p.Position
          ORDER BY 6 DESC LIMIT 5`,
  },
  {
    id: 'squad_over_budget', label: 'סגל ששווה יותר מהקופה',
    description: 'משתמשים ששווי הסגל שלהם גדול מהתקציב הפנוי שלהם (שאילתה 7)',
    params: [],
    sql: `SELECT u.User_Name AS "משתמש", u.Current_Budget AS "תקציב פנוי",
                 COALESCE(SUM(p.Current_Price), 0) AS "שווי סגל",
                 COALESCE(SUM(p.Current_Price), 0) - u.Current_Budget AS "פער"
          FROM USERS u JOIN USER_SQUADS us ON u.User_ID = us.User_ID JOIN PLAYERS p ON us.Player_ID = p.Player_ID
          GROUP BY u.User_ID, u.User_Name, u.Current_Budget
          HAVING COALESCE(SUM(p.Current_Price), 0) > u.Current_Budget
          ORDER BY 4 DESC LIMIT 50`,
  },
  {
    id: 'price_vs_position', label: 'מחיר מול ממוצע העמדה',
    description: 'עשרת השחקנים שמחירם גבוה ביותר יחסית לממוצע בעמדה שלהם (שאילתה 8)',
    params: [],
    sql: `SELECT p.First_Name || ' ' || p.Last_Name AS "שחקן", p.Position AS "עמדה", p.Current_Price AS "מחיר",
                 avg_pos.Avg_Price::NUMERIC(10,2) AS "ממוצע העמדה",
                 (p.Current_Price - avg_pos.Avg_Price)::NUMERIC(10,2) AS "סטייה"
          FROM PLAYERS p
          JOIN (SELECT Position, AVG(Current_Price) AS Avg_Price FROM PLAYERS GROUP BY Position) avg_pos
            ON p.Position = avg_pos.Position
          ORDER BY 5 DESC LIMIT 10`,
  },
];

const PORTFOLIO_SQL = 'SELECT * FROM fn_calculate_portfolio_value($1)';

export function reportsRouter(pool) {
  const r = Router();

  // ---- Stage B ----
  r.get('/queries', (_req, res) => {
    res.json(QUERIES.map(({ id, label, description, params }) => ({ id, label, description, params })));
  });

  r.post('/queries/:id', async (req, res) => {
    const query = QUERIES.find((x) => x.id === req.params.id);
    if (!query) return res.status(404).json({ error: 'שאילתה לא קיימת' });
    const values = query.params.map((p) => (req.body?.[p.name] ?? p.default));
    try {
      const out = await pool.query(query.sql, values);
      res.json({ rows: out.rows });
    } catch (err) { res.status(400).json({ error: friendlyPgError(err) }); }
  });

  // ---- Stage D ----
  // fn_calculate_portfolio_value: composite result, also updates USERS.portfolio_yield
  r.post('/programs/portfolio-value', async (req, res) => {
    try {
      const out = await pool.query(PORTFOLIO_SQL, [req.body.userId]);
      res.json(out.rows[0]);
    } catch (err) { res.status(400).json({ error: friendlyPgError(err) }); }
  });

  // fn_get_user_transactions: REF CURSOR, must be fetched inside the same transaction
  r.post('/programs/user-transactions', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = await client.query('SELECT fn_get_user_transactions($1) AS c', [req.body.userId]);
      const rows = await client.query(`FETCH ALL FROM "${cur.rows[0].c}"`);
      await client.query('COMMIT');
      res.json({ cursor: cur.rows[0].c, rows: rows.rows });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      res.status(400).json({ error: friendlyPgError(err) });
    } finally { client.release(); }
  });

  // prc_execute_trade: the validation trigger's exception is swallowed by the procedure and
  // reported via RAISE NOTICE, so we capture notices to know whether the trade went through.
  r.post('/programs/execute-trade', async (req, res) => {
    const { userId, playerId, action } = req.body;
    const client = await pool.connect();
    const notices = [];
    const onNotice = (n) => notices.push(n.message);
    client.on('notice', onNotice);
    try {
      await client.query('BEGIN');
      const before = (await client.query(PORTFOLIO_SQL, [userId])).rows[0];
      await client.query('CALL prc_execute_trade($1, $2, $3)', [userId, playerId, action]);
      const after = (await client.query(PORTFOLIO_SQL, [userId])).rows[0];
      await client.query('COMMIT');
      const rejected = notices.some((m) => m.includes('נדחתה'));
      res.json({ before, after, notices, rejected });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      res.status(400).json({ error: friendlyPgError(err), notices });
    } finally { client.removeListener('notice', onNotice); client.release(); }
  });

  // prc_process_round_price_update: updates PLAYERS prices; the AFTER UPDATE trigger writes PRICE_HISTORY
  r.post('/programs/round-update', async (_req, res) => {
    const client = await pool.connect();
    const notices = [];
    const onNotice = (n) => notices.push(n.message);
    client.on('notice', onNotice);
    try {
      const maxBefore = (await client.query('SELECT COALESCE(MAX(history_id), 0) AS m FROM price_history')).rows[0].m;
      await client.query('CALL prc_process_round_price_update()');
      const added = await client.query(
        `SELECT ph.history_id AS "מזהה", p.first_name || ' ' || p.last_name AS "שחקן", p.team_name AS "קבוצה",
                ph.recorded_price AS "מחיר חדש", 'מחזור ' || r.round_number AS "מחזור"
         FROM price_history ph JOIN players p ON p.player_id = ph.player_id JOIN rounds r ON r.round_id = ph.round_id
         WHERE ph.history_id > $1 ORDER BY ph.history_id LIMIT 100`, [maxBefore]);
      const count = (await client.query('SELECT count(*) AS c FROM price_history WHERE history_id > $1', [maxBefore])).rows[0].c;
      res.json({ notices, addedCount: parseInt(count, 10), rows: added.rows });
    } catch (err) {
      res.status(400).json({ error: friendlyPgError(err), notices });
    } finally { client.removeListener('notice', onNotice); client.release(); }
  });

  // Real-world performance of a bursa player through the Stage C view + PLAYER_MAPPING
  r.get('/players/:id/real-stats', async (req, res) => {
    try {
      const out = await pool.query('SELECT * FROM v_bursa_player_scouting WHERE player_id = $1', [req.params.id]);
      res.json(out.rows[0] || null);
    } catch (err) { res.status(400).json({ error: friendlyPgError(err) }); }
  });

  return r;
}
