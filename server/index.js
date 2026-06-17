import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Setup PostgreSQL client pool
const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER_SECRET || 'postgres',
  password: process.env.DB_PASSWORD_SECRET || '123456',
  database: process.env.DB_NAME_SECRET || 'fantasy_db',
});

// Helper position emojis
const getPositionEmoji = (position) => {
  switch (position) {
    case 'Goalkeeper': return '🧤';
    case 'Defender': return '🛡️';
    case 'Midfielder': return '🧠';
    case 'Attacker': return '🔥';
    default: return '⚽';
  }
};

// Hebrew translation helper for positions
const getHebrewPosition = (position) => {
  switch (position) {
    case 'Goalkeeper': return 'שוער';
    case 'Defender': return 'מגן';
    case 'Midfielder': return 'קשר';
    case 'Attacker': return 'חלוץ';
    default: return position;
  }
};

// 1. Get all users (sorted for simple dropdown selection)
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT User_ID as id, User_Name as name, Current_Budget as balance FROM USERS ORDER BY User_ID ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Get specific user details
app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT User_ID as id, User_Name as name, Current_Budget as balance FROM USERS WHERE User_ID = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. Get all players with history and change calculation
app.get('/api/players', async (req, res) => {
  try {
    const query = `
      SELECT p.Player_ID as id,
             p.First_Name || ' ' || p.Last_Name as name,
             p.Team_Name as team,
             p.Position as position,
             p.Current_Price as price,
             COALESCE(
               (SELECT json_agg(ph.Recorded_Price ORDER BY r.Round_Number) 
                FROM PRICE_HISTORY ph 
                JOIN ROUNDS r ON ph.Round_ID = r.Round_ID 
                WHERE ph.Player_ID = p.Player_ID), 
               '[]'::json
             ) as history,
             COALESCE(
               (SELECT MIN(ph.Recorded_Price) 
                FROM PRICE_HISTORY ph 
                WHERE ph.Player_ID = p.Player_ID),
               p.Current_Price
             ) as min_price,
             COALESCE(
               (SELECT MAX(ph.Recorded_Price) 
                FROM PRICE_HISTORY ph 
                WHERE ph.Player_ID = p.Player_ID),
               p.Current_Price
             ) as max_price,
             COALESCE(
               (SELECT COUNT(*) 
                FROM TRANSACTIONS t 
                WHERE t.Player_ID = p.Player_ID),
               0
             ) as total_trades,
             COALESCE(
               (SELECT COUNT(*) 
                FROM USER_SQUADS us 
                WHERE us.Player_ID = p.Player_ID),
               0
             ) as squad_owners
      FROM PLAYERS p
      ORDER BY p.Player_ID ASC;
    `;
    const result = await pool.query(query);

    const players = result.rows.map(row => {
      const history = row.history || [];
      let change = 0;
      if (history.length >= 2) {
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        change = prev > 0 ? parseFloat((((last - prev) / prev) * 100).toFixed(1)) : 0;
      }

      return {
        id: row.id,
        name: row.name,
        team: row.team,
        position: getHebrewPosition(row.position),
        price: row.price,
        change,
        history,
        img: getPositionEmoji(row.position),
        stats: {
          min_price: row.min_price,
          max_price: row.max_price,
          total_trades: parseInt(row.total_trades || '0'),
          squad_owners: parseInt(row.squad_owners || '0')
        }
      };
    });

    res.json(players);
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 4. Get a user's squad / portfolio
app.get('/api/users/:id/portfolio', async (req, res) => {
  try {
    const query = `
      SELECT us.Player_ID as "playerId",
             us.Lineup_Status as "lineupStatus",
             COALESCE(
               (SELECT t.Transaction_Price 
                FROM TRANSACTIONS t 
                WHERE t.User_ID = us.User_ID AND t.Player_ID = us.Player_ID AND t.Action_Type = 'BUY' 
                ORDER BY t.Transaction_Time DESC LIMIT 1),
               p.Current_Price
             ) as "boughtPrice"
      FROM USER_SQUADS us
      JOIN PLAYERS p ON us.Player_ID = p.Player_ID
      WHERE us.User_ID = $1;
    `;
    const result = await pool.query(query, [req.params.id]);
    
    // Map database output to match the frontend expectations
    const portfolio = result.rows.map(row => ({
      playerId: row.playerId,
      boughtPrice: row.boughtPrice,
      quantity: 1,
      lineupStatus: row.lineupStatus
    }));
    
    res.json(portfolio);
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 5. Get user transactions list
app.get('/api/users/:id/transactions', async (req, res) => {
  try {
    const query = `
      SELECT t.Transaction_ID as id,
             LOWER(t.Action_Type) as type,
             p.First_Name || ' ' || p.Last_Name as "playerName",
             1 as quantity,
             t.Transaction_Price as price,
             to_char(t.Transaction_Time, 'DD/MM/YYYY, HH24:MI') as timestamp
      FROM TRANSACTIONS t
      JOIN PLAYERS p ON t.Player_ID = p.Player_ID
      WHERE t.User_ID = $1
      ORDER BY t.Transaction_Time DESC;
    `;
    const result = await pool.query(query, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 6. Post Trade execution inside a PostgreSQL Transaction
app.post('/api/trade', async (req, res) => {
  const { userId, playerId, actionType } = req.body;
  
  if (!userId || !playerId || !actionType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch user budget with lock
    const userRes = await client.query('SELECT Current_Budget as balance FROM USERS WHERE User_ID = $1 FOR UPDATE', [userId]);
    if (userRes.rows.length === 0) {
      throw new Error('User not found');
    }
    const currentBudget = userRes.rows[0].balance;

    // 2. Fetch player price
    const playerRes = await client.query('SELECT Current_Price as price FROM PLAYERS WHERE Player_ID = $1', [playerId]);
    if (playerRes.rows.length === 0) {
      throw new Error('Player not found');
    }
    const currentPrice = playerRes.rows[0].price;

    if (actionType.toUpperCase() === 'BUY') {
      const cost = currentPrice;
      if (currentBudget < cost) {
        throw new Error('אין מספיק יתרה פנויה בקופה לביצוע הרכישה!');
      }

      // Check if already in squad
      const squadCheck = await client.query('SELECT 1 FROM USER_SQUADS WHERE User_ID = $1 AND Player_ID = $2', [userId, playerId]);
      if (squadCheck.rows.length > 0) {
        throw new Error('שחקן זה כבר נמצא בסגל שלך!');
      }

      // Deduct budget
      await client.query('UPDATE USERS SET Current_Budget = Current_Budget - $1 WHERE User_ID = $2', [cost, userId]);

      // Get new Squad_Record_ID
      const squadIdRes = await client.query('SELECT COALESCE(MAX(Squad_Record_ID), 0) + 1 as new_id FROM USER_SQUADS');
      const squadId = squadIdRes.rows[0].new_id;

      // Insert to USER_SQUADS
      await client.query('INSERT INTO USER_SQUADS (Squad_Record_ID, Lineup_Status, User_ID, Player_ID) VALUES ($1, \'Bench\', $2, $3)', [squadId, userId, playerId]);

      // Get new Transaction_ID
      const txIdRes = await client.query('SELECT COALESCE(MAX(Transaction_ID), 0) + 1 as new_id FROM TRANSACTIONS');
      const txId = txIdRes.rows[0].new_id;

      // Insert to TRANSACTIONS
      await client.query('INSERT INTO TRANSACTIONS (Transaction_ID, Transaction_Time, Action_Type, Transaction_Price, User_ID, Player_ID) VALUES ($1, NOW(), \'BUY\', $2, $3, $4)', [txId, currentPrice, userId, playerId]);

    } else if (actionType.toUpperCase() === 'SELL') {
      // Check if in squad
      const squadCheck = await client.query('SELECT Squad_Record_ID FROM USER_SQUADS WHERE User_ID = $1 AND Player_ID = $2', [userId, playerId]);
      if (squadCheck.rows.length === 0) {
        throw new Error('אין ברשותך שחקן זה למכירה!');
      }

      // Add to budget
      await client.query('UPDATE USERS SET Current_Budget = Current_Budget + $1 WHERE User_ID = $2', [currentPrice, userId]);

      // Delete from USER_SQUADS
      await client.query('DELETE FROM USER_SQUADS WHERE User_ID = $1 AND Player_ID = $2', [userId, playerId]);

      // Get new Transaction_ID
      const txIdRes = await client.query('SELECT COALESCE(MAX(Transaction_ID), 0) + 1 as new_id FROM TRANSACTIONS');
      const txId = txIdRes.rows[0].new_id;

      // Insert to TRANSACTIONS
      await client.query('INSERT INTO TRANSACTIONS (Transaction_ID, Transaction_Time, Action_Type, Transaction_Price, User_ID, Player_ID) VALUES ($1, NOW(), \'SELL\', $2, $3, $4)', [txId, currentPrice, userId, playerId]);
    } else {
      throw new Error('סוג פעולה לא תקין');
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 7. Toggle lineup status (Starter / Bench)
app.put('/api/portfolio/lineup', async (req, res) => {
  const { userId, playerId, lineupStatus } = req.body;
  if (!userId || !playerId || !lineupStatus) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (lineupStatus !== 'Starter' && lineupStatus !== 'Bench') {
    return res.status(400).json({ error: 'Invalid lineup status' });
  }
  try {
    await pool.query(
      'UPDATE USER_SQUADS SET Lineup_Status = $1 WHERE User_ID = $2 AND Player_ID = $3',
      [lineupStatus, userId, playerId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating lineup status:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
