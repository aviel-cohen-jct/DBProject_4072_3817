-- ====================================================================
-- שלב ב: שאילתות בסיס נתונים - פנטזי ליג
-- מגישים: אביאל כהן, נתנאל דהן
-- ====================================================================

-- ====================================================================
-- סעיף 1: שאילתות SELECT כפולות (לניתוח ביצועים והשוואת יעילות)
-- ====================================================================

-- --------------------------------------------------------------------
-- שאילתה 1: מציאת כל השחקנים שמעולם לא נקנו על ידי אף משתמש
-- --------------------------------------------------------------------

-- גרסה א' - שימוש ב-NOT IN (פחות יעילה)
SELECT Player_ID, First_Name, Last_Name, Team_Name, Current_Price
FROM PLAYERS
WHERE Player_ID NOT IN (
    SELECT DISTINCT Player_ID 
    FROM TRANSACTIONS 
    WHERE Action_Type = 'BUY' AND Player_ID IS NOT NULL
);

-- גרסה ב' - שימוש ב-NOT EXISTS (יותר יעילה)
SELECT p.Player_ID, p.First_Name, p.Last_Name, p.Team_Name, p.Current_Price
FROM PLAYERS p
WHERE NOT EXISTS (
    SELECT 1 
    FROM TRANSACTIONS t 
    WHERE t.Player_ID = p.Player_ID AND t.Action_Type = 'BUY'
);


-- --------------------------------------------------------------------
-- שאילתה 2: מציאת המשתמשים שהוציאו הכי הרבה כסף על עסקאות קנייה (BUY) בשנת 2026
-- --------------------------------------------------------------------

-- גרסה א' - שימוש ב-JOIN ו-GROUP BY (יותר יעילה לחישוב מרוכז)
SELECT u.User_ID, u.User_Name, SUM(t.Transaction_Price) as Total_Spent
FROM USERS u
JOIN TRANSACTIONS t ON u.User_ID = t.User_ID
WHERE t.Action_Type = 'BUY' AND t.Transaction_Time >= '2026-01-01 00:00:00'
GROUP BY u.User_ID, u.User_Name
ORDER BY Total_Spent DESC
LIMIT 5;

-- גרסה ב' - שימוש בתת-שאילתה מקושרת (Correlated Subquery) ב-SELECT (פחות יעילה)
SELECT u.User_ID, u.User_Name,
       (SELECT SUM(t.Transaction_Price) 
        FROM TRANSACTIONS t 
        WHERE t.User_ID = u.User_ID AND t.Action_Type = 'BUY' AND t.Transaction_Time >= '2026-01-01 00:00:00') as Total_Spent
FROM USERS u
WHERE (SELECT SUM(t.Transaction_Price) 
       FROM TRANSACTIONS t 
       WHERE t.User_ID = u.User_ID AND t.Action_Type = 'BUY' AND t.Transaction_Time >= '2026-01-01 00:00:00') IS NOT NULL
ORDER BY Total_Spent DESC
LIMIT 5;


-- --------------------------------------------------------------------
-- שאילתה 3: ספירת רשומות היסטוריית המחירים עבור כל שחקן
-- --------------------------------------------------------------------

-- גרסה א' - שימוש ב-LEFT JOIN ו-GROUP BY (יותר יעילה)
SELECT p.Player_ID, p.First_Name || ' ' || p.Last_Name as Player_Name, COUNT(ph.History_ID) as History_Count
FROM PLAYERS p
LEFT JOIN PRICE_HISTORY ph ON p.Player_ID = ph.Player_ID
GROUP BY p.Player_ID, p.First_Name, p.Last_Name
ORDER BY History_Count DESC
LIMIT 10;

-- גרסה ב' - שימוש בתת-שאילתה מקושרת ברשימת ה-SELECT (פחות יעילה)
SELECT p.Player_ID, p.First_Name || ' ' || p.Last_Name as Player_Name,
       (SELECT COUNT(*) FROM PRICE_HISTORY ph WHERE ph.Player_ID = p.Player_ID) as History_Count
FROM PLAYERS p
ORDER BY History_Count DESC
LIMIT 10;


-- --------------------------------------------------------------------
-- שאילתה 4: מציאת כל המשתמשים שמחזיקים בסגל שלהם לפחות שחקן אחד מקבוצת 'Muxagata'
-- --------------------------------------------------------------------

-- גרסה א' - שימוש ב-IN (פחות יעילה בדרך כלל)
SELECT User_ID, User_Name, Current_Budget
FROM USERS
WHERE User_ID IN (
    SELECT DISTINCT us.User_ID
    FROM USER_SQUADS us
    JOIN PLAYERS p ON us.Player_ID = p.Player_ID
    WHERE p.Team_Name = 'Muxagata'
);

-- גרסה ב' - שימוש ב-EXISTS (יותר יעילה, נעצרת בהתאמה הראשונה)
SELECT u.User_ID, u.User_Name, u.Current_Budget
FROM USERS u
WHERE EXISTS (
    SELECT 1
    FROM USER_SQUADS us
    JOIN PLAYERS p ON us.Player_ID = p.Player_ID
    WHERE us.User_ID = u.User_ID AND p.Team_Name = 'Muxagata'
);


-- ====================================================================
-- סעיף 2: שאילתות SELECT מורכבות חד-גרסתיות
-- ====================================================================

-- --------------------------------------------------------------------
-- שאילתה 5: סיכום נפח עסקאות חודשי (כמויות וסכומים) תוך פירוק תאריכים
-- --------------------------------------------------------------------
SELECT EXTRACT(YEAR FROM Transaction_Time) as Year,
       EXTRACT(MONTH FROM Transaction_Time) as Month,
       COUNT(Transaction_ID) as Total_Transactions,
       SUM(CASE WHEN Action_Type = 'BUY' THEN Transaction_Price ELSE 0 END) as Total_Buy_Value,
       SUM(CASE WHEN Action_Type = 'SELL' THEN Transaction_Price ELSE 0 END) as Total_Sell_Value,
       AVG(Transaction_Price)::NUMERIC(10,2) as Avg_Transaction_Price
FROM TRANSACTIONS
GROUP BY EXTRACT(YEAR FROM Transaction_Time), EXTRACT(MONTH FROM Transaction_Time)
ORDER BY Year DESC, Month DESC;


-- --------------------------------------------------------------------
-- שאילתה 6: חמשת השחקנים שחוו את תנודתיות המחיר הגבוהה ביותר (הפרש מקסימום ומינימום)
-- --------------------------------------------------------------------
SELECT p.Player_ID,
       p.First_Name || ' ' || p.Last_Name as Player_Name,
       p.Team_Name,
       p.Position,
       MAX(ph.Recorded_Price) as Highest_Price,
       MIN(ph.Recorded_Price) as Lowest_Price,
       (MAX(ph.Recorded_Price) - MIN(ph.Recorded_Price)) as Price_Volatility
FROM PLAYERS p
JOIN PRICE_HISTORY ph ON p.Player_ID = ph.Player_ID
GROUP BY p.Player_ID, p.First_Name, p.Last_Name, p.Team_Name, p.Position
ORDER BY Price_Volatility DESC
LIMIT 5;


-- --------------------------------------------------------------------
-- שאילתה 7: משתמשים ששווי הסגל הנוכחי שלהם גדול מהתקציב הפנוי שלהם
-- --------------------------------------------------------------------
SELECT u.User_ID,
       u.User_Name,
       u.Current_Budget as Available_Budget,
       COALESCE(SUM(p.Current_Price), 0) as Squad_Market_Value,
       (COALESCE(SUM(p.Current_Price), 0) - u.Current_Budget) as Value_Over_Budget
FROM USERS u
JOIN USER_SQUADS us ON u.User_ID = us.User_ID
JOIN PLAYERS p ON us.Player_ID = p.Player_ID
GROUP BY u.User_ID, u.User_Name, u.Current_Budget
HAVING COALESCE(SUM(p.Current_Price), 0) > u.Current_Budget
ORDER BY Value_Over_Budget DESC;


-- --------------------------------------------------------------------
-- שאילתה 8: השוואת המחיר הנוכחי של שחקן למחיר הממוצע של שחקנים בעמדה שלו
-- --------------------------------------------------------------------
SELECT p.Player_ID,
       p.First_Name || ' ' || p.Last_Name as Player_Name,
       p.Position,
       p.Current_Price,
       avg_pos.Avg_Price::NUMERIC(10,2) as Position_Average,
       (p.Current_Price - avg_pos.Avg_Price)::NUMERIC(10,2) as Price_Deviation
FROM PLAYERS p
JOIN (
    SELECT Position, AVG(Current_Price) as Avg_Price
    FROM PLAYERS
    GROUP BY Position
) avg_pos ON p.Position = avg_pos.Position
ORDER BY Price_Deviation DESC
LIMIT 10;


-- ====================================================================
-- סעיף 3: שאילתות UPDATE
-- ====================================================================

-- --------------------------------------------------------------------
-- עדכון 1: מתן בונוס תקציב של 10% (עד 50,000 ש"ח) למשתמשים פעילים במיוחד (מעל 50 עסקאות)
-- --------------------------------------------------------------------
UPDATE USERS 
SET Current_Budget = Current_Budget + LEAST(50000, CAST(Current_Budget * 0.10 AS INT))
WHERE User_ID IN (
    SELECT User_ID 
    FROM TRANSACTIONS 
    GROUP BY User_ID 
    HAVING COUNT(Transaction_ID) > 50
);


-- --------------------------------------------------------------------
-- עדכון 2: הורדת מחיר שוק של שחקנים שמעולם לא נקנו על ידי אף משתמש ב-5%
-- --------------------------------------------------------------------
UPDATE PLAYERS
SET Current_Price = CAST(Current_Price * 0.95 AS INT)
WHERE Player_ID NOT IN (
    SELECT DISTINCT Player_ID 
    FROM TRANSACTIONS 
    WHERE Action_Type = 'BUY' AND Player_ID IS NOT NULL
);


-- --------------------------------------------------------------------
-- עדכון 3: העברת כל שחקני קבוצת 'Kunwi' בהרכבי המשתמשים למעמד ספסל (Bench)
-- --------------------------------------------------------------------
UPDATE USER_SQUADS
SET Lineup_Status = 'Bench'
WHERE Player_ID IN (
    SELECT Player_ID 
    FROM PLAYERS 
    WHERE Team_Name = 'Kunwi'
);


-- ====================================================================
-- סעיף 4: שאילתות DELETE
-- ====================================================================

-- --------------------------------------------------------------------
-- מחיקה 1: מחיקת עסקאות היסטוריות ישנות שבוצעו לפני שנת 2015
-- --------------------------------------------------------------------
DELETE FROM TRANSACTIONS
WHERE Transaction_Time < '2015-01-01 00:00:00';


-- --------------------------------------------------------------------
-- מחיקה 2: מחיקת משתמשים לא פעילים (תקציב 0 ש"ח ואין להם אף שחקן בסגל)
-- --------------------------------------------------------------------
DELETE FROM USERS
WHERE Current_Budget = 0 
  AND User_ID NOT IN (SELECT DISTINCT User_ID FROM USER_SQUADS);


-- --------------------------------------------------------------------
-- מחיקה 3: מחיקת היסטוריית מחירים של סבבים ישנים שהסתיימו לפני שנת 2015
-- --------------------------------------------------------------------
DELETE FROM PRICE_HISTORY
WHERE Round_ID IN (
    SELECT Round_ID 
    FROM ROUNDS 
    WHERE Status = 'Completed' AND End_Date < '2015-01-01 00:00:00'
);
