// Generic, metadata-driven CRUD router mounted at /api/tables.
// Table and column names are always taken from TABLES (whitelist), never from the request.
import { Router } from 'express';
import { TABLES } from './meta.js';

const q = (id) => `"${id}"`; // quote identifier ("position" is a keyword)

// Rewrite a display expression so that it refers to join alias `alias` instead of `r`.
const displayFor = (table, alias) => TABLES[table].display.replace(/\br\./g, `${alias}.`);

export const friendlyPgError = (err, action = '') => {
  switch (err.code) {
    case '23505': return 'רשומה עם מפתח זה כבר קיימת';
    case '23503': return action === 'delete'
      ? 'לא ניתן למחוק: קיימות רשומות אחרות המקושרות לרשומה זו'
      : 'הערך המקושר שנבחר אינו קיים';
    case '23514': return `הערך מפר אילוץ של בסיס הנתונים (${err.constraint || ''})`;
    case '23502': return `שדה חובה חסר: ${err.column || ''}`;
    case '22P02': case '22007': case '22008': case '22003': return 'ערך לא תקין באחד השדות';
    case 'P0001': return err.message; // RAISE EXCEPTION from our triggers/routines (already Hebrew)
    default: return err.message || 'שגיאת בסיס נתונים';
  }
};

const toValue = (col, v) => {
  if (v === '' || v === undefined || v === null) return null;
  if (col.type === 'int') { const n = parseInt(v, 10); return Number.isNaN(n) ? v : n; }
  if (col.type === 'numeric') { const n = parseFloat(v); return Number.isNaN(n) ? v : n; }
  return v;
};

export function crudRouter(pool) {
  const r = Router();

  r.param('table', (req, res, next, name) => {
    const t = TABLES[name];
    if (!t) return res.status(404).json({ error: 'טבלה לא קיימת' });
    req.table = name;
    req.meta = t;
    next();
  });

  // Build SELECT with a label column for every FK
  const buildSelect = (table) => {
    const t = TABLES[table];
    const selects = ['r.*'];
    if (t.display) selects.push(`${t.display} AS "__display"`);
    const joins = [];
    const labelExprs = {};
    t.cols.forEach((col, i) => {
      if (!col.fk) return;
      const a = `f${i}`;
      const ref = TABLES[col.fk];
      const expr = displayFor(col.fk, a);
      selects.push(`${expr} AS ${q(col.name + '__label')}`);
      joins.push(`LEFT JOIN ${q(col.fk)} ${a} ON ${a}.${q(ref.pk[0])} = r.${q(col.name)}`);
      labelExprs[col.name] = expr;
    });
    const from = `FROM ${q(table)} r ${joins.join(' ')}`;
    return { sql: `SELECT ${selects.join(', ')} ${from}`, countSql: `SELECT count(*) ${from}`, labelExprs };
  };

  const pkWhere = (t, src, params) => t.pk.map((k) => {
    const col = t.cols.find((c) => c.name === k);
    const v = toValue(col, src[k]);
    if (v === null) throw Object.assign(new Error(`חסר ערך מפתח: ${col.label}`), { status: 400 });
    params.push(v);
    return `r.${q(k)} = $${params.length}`;
  }).join(' AND ');

  // LIST: ?limit&offset&q&f_<col>=value
  r.get('/:table', async (req, res) => {
    const t = req.meta;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
    const offset = parseInt(req.query.offset || '0', 10);
    const params = [];
    const where = [];
    const { sql, countSql, labelExprs } = buildSelect(req.table);

    for (const col of t.cols) {
      const fv = req.query[`f_${col.name}`];
      if (fv !== undefined) { params.push(toValue(col, fv)); where.push(`r.${q(col.name)} = $${params.length}`); }
    }
    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      const p = `$${params.length}`;
      const parts = t.cols.map((col) => col.fk ? `${labelExprs[col.name]} ILIKE ${p}` : `r.${q(col.name)}::text ILIKE ${p}`);
      where.push(`(${parts.join(' OR ')})`);
    }
    const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const order = t.pk.map((k) => `r.${q(k)}${t.orderDesc ? ' DESC' : ''}`).join(', ');
    try {
      const [rows, count] = await Promise.all([
        pool.query(`${sql}${whereSql} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`, params),
        pool.query(`${countSql}${whereSql}`, params),
      ]);
      res.json({ rows: rows.rows, total: parseInt(count.rows[0].count, 10) });
    } catch (err) { res.status(400).json({ error: friendlyPgError(err) }); }
  });

  // OPTIONS for FK pickers: ?q&limit
  r.get('/:table/options', async (req, res) => {
    const t = req.meta;
    if (!t.display) return res.status(400).json({ error: 'לטבלה זו אין תצוגת שם' });
    const params = [`%${req.query.q || ''}%`];
    const limit = Math.min(parseInt(req.query.limit || '30', 10), 200);
    try {
      const out = await pool.query(
        `SELECT r.${q(t.pk[0])} AS value, ${t.display} AS label FROM ${q(req.table)} r
         WHERE ${t.display} ILIKE $1 OR r.${q(t.pk[0])}::text = $2 ORDER BY 2 LIMIT ${limit}`,
        [params[0], String(req.query.q || '')]);
      res.json(out.rows);
    } catch (err) { res.status(400).json({ error: friendlyPgError(err) }); }
  });

  // ROW by key: ?<pk>=value
  r.get('/:table/row', async (req, res) => {
    const t = req.meta;
    try {
      const params = [];
      const where = pkWhere(t, req.query, params);
      const { sql } = buildSelect(req.table);
      const out = await pool.query(`${sql} WHERE ${where}`, params);
      if (!out.rows.length) return res.status(404).json({ error: 'לא נמצאה רשומה עם מפתח זה' });
      res.json(out.rows[0]);
    } catch (err) { res.status(err.status || 400).json({ error: friendlyPgError(err) }); }
  });

  // INSERT
  r.post('/:table', async (req, res) => {
    const t = req.meta;
    const cols = [];
    const vals = [];
    const params = [];
    for (const col of t.cols) {
      const v = toValue(col, req.body[col.name]);
      if (v === null) {
        if (t.autoPk && t.pk[0] === col.name) {
          cols.push(q(col.name));
          vals.push(`(SELECT COALESCE(MAX(${q(col.name)}), 0) + 1 FROM ${q(req.table)})`);
        }
        continue;
      }
      cols.push(q(col.name));
      params.push(v);
      vals.push(`$${params.length}`);
    }
    try {
      const out = await pool.query(`INSERT INTO ${q(req.table)} (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`, params);
      res.status(201).json(out.rows[0]);
    } catch (err) { res.status(400).json({ error: friendlyPgError(err, 'insert') }); }
  });

  // UPDATE (body contains pk values + editable fields)
  r.put('/:table', async (req, res) => {
    const t = req.meta;
    const params = [];
    const sets = [];
    for (const col of t.cols) {
      if (t.pk.includes(col.name)) continue;
      if (!(col.name in req.body)) continue;
      params.push(toValue(col, req.body[col.name]));
      sets.push(`${q(col.name)} = $${params.length}`);
    }
    if (!sets.length) return res.status(400).json({ error: 'אין שדות לעדכון' });
    try {
      const where = pkWhere(t, req.body, params);
      const out = await pool.query(`UPDATE ${q(req.table)} r SET ${sets.join(', ')} WHERE ${where} RETURNING *`, params);
      if (!out.rowCount) return res.status(404).json({ error: 'לא נמצאה רשומה עם מפתח זה' });
      res.json(out.rows[0]);
    } catch (err) { res.status(err.status || 400).json({ error: friendlyPgError(err, 'update') }); }
  });

  // DELETE ?<pk>=value
  r.delete('/:table', async (req, res) => {
    const t = req.meta;
    try {
      const params = [];
      const where = pkWhere(t, req.query, params);
      const out = await pool.query(`DELETE FROM ${q(req.table)} r WHERE ${where}`, params);
      if (!out.rowCount) return res.status(404).json({ error: 'לא נמצאה רשומה עם מפתח זה' });
      res.json({ deleted: out.rowCount });
    } catch (err) { res.status(err.status || 400).json({ error: friendlyPgError(err, 'delete') }); }
  });

  return r;
}
