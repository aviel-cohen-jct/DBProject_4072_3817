import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER_SECRET || 'postgres',
  password: process.env.DB_PASSWORD_SECRET || '123456',
  database: process.env.DB_NAME_SECRET || 'fantasy_db',
});

// Helper to format query results as HTML table
function formatTable(rows) {
  if (!rows || rows.length === 0) return '<div class="no-data">אין נתונים להצגה</div>';
  const headers = Object.keys(rows[0]);
  
  let html = '<table><thead><tr>';
  headers.forEach(h => {
    html += `<th>${h}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  rows.forEach(row => {
    html += '<tr>';
    headers.forEach(h => {
      let val = row[h];
      if (val instanceof Date) {
        val = val.toLocaleString('he-IL');
      } else if (typeof val === 'number' && !Number.isInteger(val)) {
        val = val.toFixed(2);
      } else if (val === null || val === undefined) {
        val = 'NULL';
      }
      html += `<td>${val}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

async function runExplain(client, sql, params = []) {
  try {
    const res = await client.query(`EXPLAIN ANALYZE ${sql}`, params);
    return res.rows.map(r => r['QUERY PLAN']).join('\n');
  } catch (err) {
    return `Error explaining query: ${err.message}`;
  }
}

async function main() {
  const client = await pool.connect();
  const reportData = [];

  console.log("Running report queries...");

  try {
    // ----------------------------------------------------
    // SELECT queries
    // ----------------------------------------------------
    const selectQueries = [
      {
        id: 'select1a',
        title: "שאילתה 1 גרסה א' (NOT IN) - שחקנים שלא נרכשו",
        sql: `SELECT Player_ID, First_Name, Last_Name, Team_Name, Current_Price FROM PLAYERS WHERE Player_ID NOT IN (SELECT DISTINCT Player_ID FROM TRANSACTIONS WHERE Action_Type = 'BUY' AND Player_ID IS NOT NULL) LIMIT 5;`
      },
      {
        id: 'select1b',
        title: "שאילתה 1 גרסה ב' (NOT EXISTS) - שחקנים שלא נרכשו (מומלצת)",
        sql: `SELECT p.Player_ID, p.First_Name, p.Last_Name, p.Team_Name, p.Current_Price FROM PLAYERS p WHERE NOT EXISTS (SELECT 1 FROM TRANSACTIONS t WHERE t.Player_ID = p.Player_ID AND t.Action_Type = 'BUY') LIMIT 5;`
      },
      {
        id: 'select2a',
        title: "שאילתה 2 גרסה א' (JOIN) - 5 המשתמשים שהוציאו הכי הרבה ב-2026",
        sql: `SELECT u.User_ID, u.User_Name, SUM(t.Transaction_Price) as Total_Spent FROM USERS u JOIN TRANSACTIONS t ON u.User_ID = t.User_ID WHERE t.Action_Type = 'BUY' AND t.Transaction_Time >= '2026-01-01 00:00:00' GROUP BY u.User_ID, u.User_Name ORDER BY Total_Spent DESC LIMIT 5;`
      },
      {
        id: 'select2b',
        title: "שאילתה 2 גרסה ב' (Subquery) - 5 המשתמשים שהוציאו הכי הרבה ב-2026",
        sql: `SELECT u.User_ID, u.User_Name, (SELECT SUM(t.Transaction_Price) FROM TRANSACTIONS t WHERE t.User_ID = u.User_ID AND t.Action_Type = 'BUY' AND t.Transaction_Time >= '2026-01-01 00:00:00') as Total_Spent FROM USERS u WHERE (SELECT SUM(t.Transaction_Price) FROM TRANSACTIONS t WHERE t.User_ID = u.User_ID AND t.Action_Type = 'BUY' AND t.Transaction_Time >= '2026-01-01 00:00:00') IS NOT NULL ORDER BY Total_Spent DESC LIMIT 5;`
      },
      {
        id: 'select3a',
        title: "שאילתה 3 גרסה א' (LEFT JOIN) - כמות היסטוריית מחירים לכל שחקן",
        sql: `SELECT p.Player_ID, p.First_Name || ' ' || p.Last_Name as Player_Name, COUNT(ph.History_ID) as History_Count FROM PLAYERS p LEFT JOIN PRICE_HISTORY ph ON p.Player_ID = ph.Player_ID GROUP BY p.Player_ID, p.First_Name, p.Last_Name ORDER BY History_Count DESC LIMIT 5;`
      },
      {
        id: 'select3b',
        title: "שאילתה 3 גרסה ב' (Subquery) - כמות היסטוריית מחירים לכל שחקן",
        sql: `SELECT p.Player_ID, p.First_Name || ' ' || p.Last_Name as Player_Name, (SELECT COUNT(*) FROM PRICE_HISTORY ph WHERE ph.Player_ID = p.Player_ID) as History_Count FROM PLAYERS p ORDER BY History_Count DESC LIMIT 5;`
      },
      {
        id: 'select4a',
        title: "שאילתה 4 גרסה א' (IN) - מחזיקים שחקן מקבוצת Muxagata בסגל",
        sql: `SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID IN (SELECT DISTINCT us.User_ID FROM USER_SQUADS us JOIN PLAYERS p ON us.Player_ID = p.Player_ID WHERE p.Team_Name = 'Muxagata') LIMIT 5;`
      },
      {
        id: 'select4b',
        title: "שאילתה 4 גרסה ב' (EXISTS) - מחזיקים שחקן מקבוצת Muxagata בסגל (מומלצת)",
        sql: `SELECT u.User_ID, u.User_Name, u.Current_Budget FROM USERS u WHERE EXISTS (SELECT 1 FROM USER_SQUADS us JOIN PLAYERS p ON us.Player_ID = p.Player_ID WHERE us.User_ID = u.User_ID AND p.Team_Name = 'Muxagata') LIMIT 5;`
      },
      {
        id: 'select5',
        title: "שאילתה 5: סיכום נפח עסקאות חודשי ושנתי",
        sql: `SELECT EXTRACT(YEAR FROM Transaction_Time) as Year, EXTRACT(MONTH FROM Transaction_Time) as Month, COUNT(Transaction_ID) as Total_Transactions, SUM(CASE WHEN Action_Type = 'BUY' THEN Transaction_Price ELSE 0 END) as Total_Buy, SUM(CASE WHEN Action_Type = 'SELL' THEN Transaction_Price ELSE 0 END) as Total_Sell, AVG(Transaction_Price)::NUMERIC(10,2) as Avg_Price FROM TRANSACTIONS GROUP BY EXTRACT(YEAR FROM Transaction_Time), EXTRACT(MONTH FROM Transaction_Time) ORDER BY Year DESC, Month DESC LIMIT 5;`
      },
      {
        id: 'select6',
        title: "שאילתה 6: חמשת השחקנים בעלי תנודתיות המחיר הגבוהה ביותר",
        sql: `SELECT p.Player_ID, p.First_Name || ' ' || p.Last_Name as Player_Name, p.Team_Name, MAX(ph.Recorded_Price) - MIN(ph.Recorded_Price) as Volatility FROM PLAYERS p JOIN PRICE_HISTORY ph ON p.Player_ID = ph.Player_ID GROUP BY p.Player_ID, p.First_Name, p.Last_Name, p.Team_Name ORDER BY Volatility DESC LIMIT 5;`
      },
      {
        id: 'select7',
        title: "שאילתה 7: משתמשים ששווי הסגל גדול מהתקציב שלהם",
        sql: `SELECT u.User_ID, u.User_Name, u.Current_Budget as Budget, COALESCE(SUM(p.Current_Price), 0) as Squad_Value FROM USERS u JOIN USER_SQUADS us ON u.User_ID = us.User_ID JOIN PLAYERS p ON us.Player_ID = p.Player_ID GROUP BY u.User_ID, u.User_Name, u.Current_Budget HAVING COALESCE(SUM(p.Current_Price), 0) > u.Current_Budget ORDER BY Squad_Value DESC LIMIT 5;`
      },
      {
        id: 'select8',
        title: "שאילתה 8: השוואת מחיר שחקן לממוצע העמדה שלו",
        sql: `SELECT p.Player_ID, p.First_Name || ' ' || p.Last_Name as Player_Name, p.Position, p.Current_Price, avg_pos.Avg_Price::NUMERIC(10,2) as Pos_Avg, (p.Current_Price - avg_pos.Avg_Price)::NUMERIC(10,2) as Deviation FROM PLAYERS p JOIN (SELECT Position, AVG(Current_Price) as Avg_Price FROM PLAYERS GROUP BY Position) avg_pos ON p.Position = avg_pos.Position ORDER BY Deviation DESC LIMIT 5;`
      }
    ];

    for (const q of selectQueries) {
      const explainText = await runExplain(client, q.sql);
      const res = await client.query(q.sql);
      reportData.push({
        type: 'select',
        id: q.id,
        title: q.title,
        sql: q.sql,
        explain: explainText,
        tableHtml: formatTable(res.rows)
      });
    }

    // ----------------------------------------------------
    // UPDATE queries (Inside transaction + Rollback)
    // ----------------------------------------------------
    const updates = [
      {
        id: 'update1',
        title: "עדכון 1: בונוס תקציב של 10% למשתמשים פעילים (מעל 50 עסקאות)",
        beforeSql: `SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID IN (SELECT User_ID FROM TRANSACTIONS GROUP BY User_ID HAVING COUNT(Transaction_ID) > 50) LIMIT 5;`,
        updateSql: `UPDATE USERS SET Current_Budget = Current_Budget + LEAST(50000, CAST(Current_Budget * 0.10 AS INT)) WHERE User_ID IN (SELECT User_ID FROM TRANSACTIONS GROUP BY User_ID HAVING COUNT(Transaction_ID) > 50);`,
        afterSql: `SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID IN (SELECT User_ID FROM TRANSACTIONS GROUP BY User_ID HAVING COUNT(Transaction_ID) > 50) LIMIT 5;`
      },
      {
        id: 'update2',
        title: "עדכון 2: הורדת מחיר שחקנים שלא נקנו ב-5%",
        beforeSql: `SELECT Player_ID, First_Name || ' ' || Last_Name as Player_Name, Team_Name, Current_Price FROM PLAYERS WHERE Player_ID NOT IN (SELECT DISTINCT Player_ID FROM TRANSACTIONS WHERE Action_Type = 'BUY' AND Player_ID IS NOT NULL) LIMIT 5;`,
        updateSql: `UPDATE PLAYERS SET Current_Price = CAST(Current_Price * 0.95 AS INT) WHERE Player_ID NOT IN (SELECT DISTINCT Player_ID FROM TRANSACTIONS WHERE Action_Type = 'BUY' AND Player_ID IS NOT NULL);`,
        afterSql: `SELECT Player_ID, First_Name || ' ' || Last_Name as Player_Name, Team_Name, Current_Price FROM PLAYERS WHERE Player_ID NOT IN (SELECT DISTINCT Player_ID FROM TRANSACTIONS WHERE Action_Type = 'BUY' AND Player_ID IS NOT NULL) LIMIT 5;`
      },
      {
        id: 'update3',
        title: "עדכון 3: העברת כל שחקני קבוצת 'Kunwi' לספסל (Bench)",
        beforeSql: `SELECT us.Squad_Record_ID, u.User_Name, p.First_Name || ' ' || p.Last_Name as Player_Name, p.Team_Name, us.Lineup_Status FROM USER_SQUADS us JOIN USERS u ON us.User_ID = u.User_ID JOIN PLAYERS p ON us.Player_ID = p.Player_ID WHERE p.Team_Name = 'Kunwi' LIMIT 5;`,
        updateSql: `UPDATE USER_SQUADS SET Lineup_Status = 'Bench' WHERE Player_ID IN (SELECT Player_ID FROM PLAYERS WHERE Team_Name = 'Kunwi');`,
        afterSql: `SELECT us.Squad_Record_ID, u.User_Name, p.First_Name || ' ' || p.Last_Name as Player_Name, p.Team_Name, us.Lineup_Status FROM USER_SQUADS us JOIN USERS u ON us.User_ID = u.User_ID JOIN PLAYERS p ON us.Player_ID = p.Player_ID WHERE p.Team_Name = 'Kunwi' LIMIT 5;`
      }
    ];

    for (const u of updates) {
      await client.query('BEGIN');
      const beforeRes = await client.query(u.beforeSql);
      const updateRes = await client.query(u.updateSql);
      const afterRes = await client.query(u.afterSql);
      await client.query('ROLLBACK');

      reportData.push({
        type: 'update',
        id: u.id,
        title: u.title,
        updateSql: u.updateSql,
        countAffected: updateRes.rowCount,
        beforeTable: formatTable(beforeRes.rows),
        afterTable: formatTable(afterRes.rows)
      });
    }

    // ----------------------------------------------------
    // DELETE queries (Inside transaction + Rollback)
    // ----------------------------------------------------
    const deletes = [
      {
        id: 'delete1',
        title: "מחיקה 1: מחיקת עסקאות היסטוריות לפני שנת 2015",
        beforeSql: `SELECT COUNT(*) as transactions_count FROM TRANSACTIONS WHERE Transaction_Time < '2015-01-01 00:00:00';`,
        deleteSql: `DELETE FROM TRANSACTIONS WHERE Transaction_Time < '2015-01-01 00:00:00';`,
        afterSql: `SELECT COUNT(*) as transactions_count FROM TRANSACTIONS WHERE Transaction_Time < '2015-01-01 00:00:00';`
      },
      {
        id: 'delete2',
        title: "מחיקה 2: מחיקת משתמשים לא פעילים (תקציב 0 ש\"ח וללא שחקנים בסגל)",
        beforeSql: `SELECT COUNT(*) as inactive_users_count FROM USERS WHERE Current_Budget = 0 AND User_ID NOT IN (SELECT DISTINCT User_ID FROM USER_SQUADS);`,
        deleteSql: `DELETE FROM USERS WHERE Current_Budget = 0 AND User_ID NOT IN (SELECT DISTINCT User_ID FROM USER_SQUADS);`,
        afterSql: `SELECT COUNT(*) as inactive_users_count FROM USERS WHERE Current_Budget = 0 AND User_ID NOT IN (SELECT DISTINCT User_ID FROM USER_SQUADS);`
      },
      {
        id: 'delete3',
        title: "מחיקה 3: מחיקת היסטוריית מחירי שחקנים של סבבים שהסתיימו לפני שנת 2015",
        beforeSql: `SELECT COUNT(*) as old_history_count FROM PRICE_HISTORY WHERE Round_ID IN (SELECT Round_ID FROM ROUNDS WHERE Status = 'Completed' AND End_Date < '2015-01-01 00:00:00');`,
        deleteSql: `DELETE FROM PRICE_HISTORY WHERE Round_ID IN (SELECT Round_ID FROM ROUNDS WHERE Status = 'Completed' AND End_Date < '2015-01-01 00:00:00');`,
        afterSql: `SELECT COUNT(*) as old_history_count FROM PRICE_HISTORY WHERE Round_ID IN (SELECT Round_ID FROM ROUNDS WHERE Status = 'Completed' AND End_Date < '2015-01-01 00:00:00');`
      }
    ];

    for (const d of deletes) {
      await client.query('BEGIN');
      const beforeRes = await client.query(d.beforeSql);
      const deleteRes = await client.query(d.deleteSql);
      const afterRes = await client.query(d.afterSql);
      await client.query('ROLLBACK');

      reportData.push({
        type: 'delete',
        id: d.id,
        title: d.title,
        deleteSql: d.deleteSql,
        countAffected: deleteRes.rowCount,
        beforeTable: formatTable(beforeRes.rows),
        afterTable: formatTable(afterRes.rows)
      });
    }

    // ----------------------------------------------------
    // CONSTRAINTS checks
    // ----------------------------------------------------
    const constraints = [
      {
        id: 'constraint1',
        title: "אילוץ 1 (chk_user_name_len) - אורך שם משתמש >= 3 תווים",
        sql: `INSERT INTO USERS (User_ID, User_Name, Current_Budget) VALUES (9999, 'ab', 100000);`
      },
      {
        id: 'constraint2',
        title: "אילוץ 2 (chk_tx_time_past) - תאריך עסקה אינו בעתיד",
        sql: `INSERT INTO TRANSACTIONS (Transaction_ID, Transaction_Time, Action_Type, Transaction_Price, User_ID, Player_ID) VALUES (99999, NOW() + INTERVAL '1 day', 'BUY', 5000, 1, 1);`
      },
      {
        id: 'constraint3',
        title: "אילוץ 3 (uq_user_player) - מניעת כפילות שחקן בסגל של אותו משתמש",
        sql: `INSERT INTO USER_SQUADS (Squad_Record_ID, Lineup_Status, User_ID, Player_ID) VALUES (99999, 'Bench', 1, 1);`
      }
    ];

    for (const c of constraints) {
      let errorMsg = '';
      await client.query('BEGIN');
      try {
        await client.query(c.sql);
      } catch (err) {
        errorMsg = err.message;
      } finally {
        await client.query('ROLLBACK');
      }

      reportData.push({
        type: 'constraint',
        id: c.id,
        title: c.title,
        sql: c.sql,
        error: errorMsg
      });
    }

    // ----------------------------------------------------
    // TRANSACTION Demo: ROLLBACK & COMMIT
    // ----------------------------------------------------
    // Demo 1: Rollback
    await client.query('BEGIN');
    const rb_before = await client.query(`SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID = 1;`);
    await client.query(`UPDATE USERS SET Current_Budget = Current_Budget + 100000 WHERE User_ID = 1;`);
    const rb_inside = await client.query(`SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID = 1;`);
    await client.query('ROLLBACK');
    const rb_after = await client.query(`SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID = 1;`);

    reportData.push({
      type: 'transaction',
      id: 'tx_rollback',
      title: "הדגמת בקרת טרנזקציות - ROLLBACK (ביטול שינויים)",
      beforeTable: formatTable(rb_before.rows),
      insideTable: formatTable(rb_inside.rows),
      afterTable: formatTable(rb_after.rows)
    });

    // Demo 2: Commit
    await client.query('BEGIN');
    const c_before = await client.query(`SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID = 1;`);
    await client.query(`UPDATE USERS SET Current_Budget = Current_Budget + 50000 WHERE User_ID = 1;`);
    const c_inside = await client.query(`SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID = 1;`);
    await client.query('COMMIT');
    const c_after = await client.query(`SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID = 1;`);

    // Reset user 1 budget to original (subtract the 50,000 we just committed, to leave database pristine)
    await client.query(`UPDATE USERS SET Current_Budget = Current_Budget - 50000 WHERE User_ID = 1;`);

    reportData.push({
      type: 'transaction',
      id: 'tx_commit',
      title: "הדגמת בקרת טרנזקציות - COMMIT (שמירת שינויים)",
      beforeTable: formatTable(c_before.rows),
      insideTable: formatTable(c_inside.rows),
      afterTable: formatTable(c_after.rows)
    });

  } catch (err) {
    console.error("Error generating report data:", err);
  } finally {
    client.release();
  }

  // Generate HTML
  let html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>דוח הרצות שלב ב' - פנטזי ליג</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background-color: #0b0f19;
      color: #e2e8f0;
      margin: 0;
      padding: 40px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #10b981;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 15px;
      margin-bottom: 40px;
      text-align: center;
    }
    .card {
      background-color: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 40px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }
    .card-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-top: 0;
      margin-bottom: 16px;
      border-bottom: 1px solid #334155;
      padding-bottom: 8px;
    }
    .sql-code {
      background-color: #020617;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 12px;
      font-family: monospace;
      font-size: 0.9rem;
      color: #38bdf8;
      white-space: pre-wrap;
      margin-bottom: 16px;
    }
    .explain-block {
      background-color: #020617;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 12px;
      font-family: monospace;
      font-size: 0.8rem;
      color: #94a3b8;
      white-space: pre;
      overflow-x: auto;
      max-height: 150px;
      margin-bottom: 16px;
    }
    .error-block {
      background-color: #7f1d1d;
      border: 1px solid #b91c1c;
      border-radius: 8px;
      padding: 12px;
      font-family: monospace;
      font-size: 0.9rem;
      color: #fca5a5;
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 10px;
      background-color: #020617;
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 10px 14px;
      text-align: right;
      border-bottom: 1px solid #1e293b;
    }
    th {
      background-color: #1e293b;
      color: #10b981;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    td {
      font-size: 0.9rem;
      color: #cbd5e1;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .flex-tables {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .flex-table-item {
      flex: 1;
      min-width: 300px;
    }
    .table-title {
      font-size: 0.9rem;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 6px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>פנטזי ליג - דוח הרצות שלב ב'</h1>
`;

  reportData.forEach(item => {
    html += `<div class="card" id="${item.id}">`;
    html += `<div class="card-title">${item.title}</div>`;

    if (item.type === 'select') {
      html += `<div class="sql-code">${item.sql}</div>`;
      html += `<div class="table-title">תוצאת השאילתה (מוגבל ל-5 שורות):</div>`;
      html += item.tableHtml;
      html += `<div class="table-title">תוכנית הרצה (EXPLAIN ANALYZE):</div>`;
      html += `<div class="explain-block">${item.explain}</div>`;
    } 
    else if (item.type === 'update') {
      html += `<div class="sql-code">${item.updateSql}</div>`;
      html += `<div class="table-title">נפגעו ${item.countAffected} שורות בעדכון.</div>`;
      html += `<div class="flex-tables">`;
      html += `<div class="flex-table-item"><div class="table-title">לפני העדכון:</div>${item.beforeTable}</div>`;
      html += `<div class="flex-table-item"><div class="table-title">אחרי העדכון:</div>${item.afterTable}</div>`;
      html += `</div>`;
    } 
    else if (item.type === 'delete') {
      html += `<div class="sql-code">${item.deleteSql}</div>`;
      html += `<div class="table-title">נמחקו ${item.countAffected} שורות.</div>`;
      html += `<div class="flex-tables">`;
      html += `<div class="flex-table-item"><div class="table-title">לפני המחיקה:</div>${item.beforeTable}</div>`;
      html += `<div class="flex-table-item"><div class="table-title">אחרי המחיקה:</div>${item.afterTable}</div>`;
      html += `</div>`;
    } 
    else if (item.type === 'constraint') {
      html += `<div class="sql-code">${item.sql}</div>`;
      html += `<div class="table-title">שגיאת האילוץ שהתקבלה ממסד הנתונים:</div>`;
      html += `<div class="error-block">${item.error}</div>`;
    } 
    else if (item.type === 'transaction') {
      html += `<div class="flex-tables">`;
      html += `<div class="flex-table-item"><div class="table-title">1. מצב התחלתי:</div>${item.beforeTable}</div>`;
      html += `<div class="flex-table-item"><div class="table-title">2. בתוך הטרנזקציה (לאחר ה-UPDATE):</div>${item.insideTable}</div>`;
      html += `<div class="flex-table-item"><div class="table-title">3. מצב סופי (לאחר ROLLBACK/COMMIT):</div>${item.afterTable}</div>`;
      html += `</div>`;
    }

    html += `</div>`;
  });

  html += `
  </div>
</body>
</html>
`;

  const publicPath = path.join(__dirname, '..', 'public', 'report_screenshots.html');
  fs.writeFileSync(publicPath, html);
  console.log(`Report successfully written to ${publicPath}`);

  await pool.end();
}

main();
