-- ====================================================================
-- שלב ב: יצירת אינדקסים ובדיקת שיפור ביצועים
-- מגישים: אביאל כהן, נתנאל דהן
-- ====================================================================

-- --------------------------------------------------------------------
-- אינדקס 1: שיפור שאילתות על עסקאות של משתמש ספציפי וסוג עסקה מסוים
-- טבלה: TRANSACTIONS, עמודות: User_ID, Action_Type
-- --------------------------------------------------------------------

-- שאילתת בדיקה 1 (לפני יצירת האינדקס):
EXPLAIN ANALYZE
SELECT * FROM TRANSACTIONS 
WHERE User_ID = 273 AND Action_Type = 'BUY';

-- יצירת האינדקס:
CREATE INDEX idx_transactions_user_action ON TRANSACTIONS(User_ID, Action_Type);

-- שאילתת בדיקה 1 (אחרי יצירת האינדקס):
EXPLAIN ANALYZE
SELECT * FROM TRANSACTIONS 
WHERE User_ID = 273 AND Action_Type = 'BUY';


-- --------------------------------------------------------------------
-- אינדקס 2: שיפור שאילתות השולפות את היסטוריית המחירים של שחקן ספציפי
-- טבלה: PRICE_HISTORY, עמודה: Player_ID
-- --------------------------------------------------------------------

-- שאילתת בדיקה 2 (לפני יצירת האינדקס):
EXPLAIN ANALYZE
SELECT * FROM PRICE_HISTORY 
WHERE Player_ID = 15;

-- יצירת האינדקס:
CREATE INDEX idx_price_history_player ON PRICE_HISTORY(Player_ID);

-- שאילתת בדיקה 2 (אחרי יצירת האינדקס):
EXPLAIN ANALYZE
SELECT * FROM PRICE_HISTORY 
WHERE Player_ID = 15;


-- --------------------------------------------------------------------
-- אינדקס 3: שיפור שאילתות וסינונים של שחקנים לפי שם קבוצה
-- טבלה: PLAYERS, עמודה: Team_Name
-- --------------------------------------------------------------------

-- שאילתת בדיקה 3 (לפני יצירת האינדקס):
EXPLAIN ANALYZE
SELECT * FROM PLAYERS 
WHERE Team_Name = 'Kunwi';

-- יצירת האינדקס:
CREATE INDEX idx_players_team ON PLAYERS(Team_Name);

-- שאילתת בדיקה 3 (אחרי יצירת האינדקס):
EXPLAIN ANALYZE
SELECT * FROM PLAYERS 
WHERE Team_Name = 'Kunwi';
