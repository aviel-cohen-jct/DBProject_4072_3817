-- ============================================================
-- שלב ג' - מבטים (Views) ושאילתות על המבטים
-- ============================================================
-- מבט 1: מנקודת המבט של האגף שלנו   (בורסת השחקנים)
-- מבט 2: מנקודת המבט של האגף שקיבלנו (כדורגל עולם אמיתי)
-- שני המבטים משלבים טבלאות משתי המערכות דרך טבלת הגישור PLAYER_MAPPING.
-- ============================================================

-- ------------------------------------------------------------
-- מבט 1: V_BURSA_PLAYER_SCOUTING - נקודת המבט של הבורסה
-- ------------------------------------------------------------
-- לכל שחקן בורסה: נתוני השוק שלו (מחיר נוכחי, מחיר ממוצע בעסקאות,
-- נפח מסחר) לצד הביצועים שלו בעולם האמיתי (משחקים, שערים, בישולים)
-- שמגיעים מהמערכת שקיבלנו דרך טבלת הגישור.
-- מאפשר לסוחרי הבורסה לזהות שחקנים שהביצועים האמיתיים שלהם
-- לא משתקפים עדיין במחיר השוק.

CREATE OR REPLACE VIEW V_BURSA_PLAYER_SCOUTING AS
WITH market AS (
    SELECT player_id,
           COUNT(*)               AS trade_volume,
           ROUND(AVG(transaction_price), 2) AS avg_tx_price
    FROM TRANSACTIONS
    GROUP BY player_id
),
real_stats AS (
    SELECT pms.playerid,
           COUNT(*)          AS matches_played,
           SUM(pms.goals)    AS total_goals,
           SUM(pms.assists)  AS total_assists,
           SUM(pms.tackles)  AS total_tackles
    FROM PLAYERMATCHSTATS pms
    GROUP BY pms.playerid
)
SELECT b.player_id,
       b.first_name || ' ' || b.last_name AS bursa_name,
       b.position,
       b.current_price,
       COALESCE(mk.trade_volume, 0)   AS trade_volume,
       COALESCE(mk.avg_tx_price, 0)   AS avg_tx_price,
       COALESCE(rs.matches_played, 0) AS matches_played,
       COALESCE(rs.total_goals, 0)    AS total_goals,
       COALESCE(rs.total_assists, 0)  AS total_assists,
       COALESCE(rs.total_tackles, 0)  AS total_tackles
FROM PLAYERS b
JOIN PLAYER_MAPPING m ON m.bursa_player_id = b.player_id
LEFT JOIN market     mk ON mk.player_id = b.player_id
LEFT JOIN real_stats rs ON rs.playerid  = m.real_player_id;

-- ------------------------------------------------------------
-- מבט 2: V_REAL_PLAYER_MARKET_VALUE - נקודת המבט של העולם האמיתי
-- ------------------------------------------------------------
-- לכל שחקן במערכת שקיבלנו: הקבוצה הנוכחית והשכר שלו (מהמערכת שלהם),
-- לצד שווי השוק שלו בבורסה שלנו (מחיר נוכחי וטווח מחירים היסטורי)
-- דרך טבלת הגישור.
-- מאפשר למועדון להשוות בין השכר שהוא משלם לשחקן לבין הערך
-- שהשוק מייחס לו.

CREATE OR REPLACE VIEW V_REAL_PLAYER_MARKET_VALUE AS
WITH price_range AS (
    SELECT player_id,
           MIN(recorded_price) AS min_price,
           MAX(recorded_price) AS max_price
    FROM PRICE_HISTORY
    GROUP BY player_id
)
SELECT r.playerid,
       r.playername,
       r.position,
       r.nativecountry,
       t.teamname,
       pf.salary,
       b.current_price               AS bursa_current_price,
       COALESCE(pr.min_price, 0)     AS bursa_min_price,
       COALESCE(pr.max_price, 0)     AS bursa_max_price
FROM PLAYER r
JOIN PLAYSFOR_PLAYER pf ON pf.playerid = r.playerid
JOIN TEAM t             ON t.teamid    = pf.teamid
JOIN PLAYER_MAPPING m   ON m.real_player_id = r.playerid
JOIN PLAYERS b          ON b.player_id      = m.bursa_player_id
LEFT JOIN price_range pr ON pr.player_id    = m.bursa_player_id;

-- ------------------------------------------------------------
-- שליפה מהמבטים (SELECT * - עד 10 רשומות לדוח)
-- ------------------------------------------------------------
SELECT * FROM V_BURSA_PLAYER_SCOUTING     ORDER BY player_id LIMIT 10;
SELECT * FROM V_REAL_PLAYER_MARKET_VALUE  ORDER BY playerid  LIMIT 10;

-- ============================================================
-- שאילתות על מבט 1 (V_BURSA_PLAYER_SCOUTING)
-- ============================================================

-- שאילתה 1.1: "מציאות" בבורסה - שחקנים מתחת למחיר השוק הממוצע
-- שתרומתם ההתקפית בעולם האמיתי (שערים + בישולים) גבוהה.
-- ממוינים לפי תרומה יורדת - מועמדים מובילים לקנייה.
SELECT bursa_name,
       position,
       current_price,
       total_goals + total_assists AS total_contribution,
       matches_played
FROM V_BURSA_PLAYER_SCOUTING
WHERE current_price < (SELECT AVG(current_price) FROM V_BURSA_PLAYER_SCOUTING)
  AND total_goals + total_assists >= 15
ORDER BY total_contribution DESC, current_price ASC
LIMIT 15;

-- שאילתה 1.2: ניתוח לפי עמדה - האם השוק מתמחר עמדות לפי ביצועים?
-- לכל עמדה: מחיר ממוצע, נפח מסחר ממוצע, וממוצע שערים למשחק.
SELECT position,
       COUNT(*)                                    AS players_count,
       ROUND(AVG(current_price), 2)                AS avg_price,
       ROUND(AVG(trade_volume), 2)                 AS avg_trade_volume,
       ROUND(AVG(total_goals::numeric / NULLIF(matches_played, 0)), 3) AS avg_goals_per_match
FROM V_BURSA_PLAYER_SCOUTING
GROUP BY position
ORDER BY avg_price DESC;

-- ============================================================
-- שאילתות על מבט 2 (V_REAL_PLAYER_MARKET_VALUE)
-- ============================================================

-- שאילתה 2.1: שכר מול שווי שוק - שחקנים שמרוויחים הרבה
-- אבל שווי הבורסה שלהם נמוך מהחציון (סיכון פיננסי למועדון).
SELECT playername,
       teamname,
       salary,
       bursa_current_price
FROM V_REAL_PLAYER_MARKET_VALUE
WHERE salary > (SELECT AVG(salary) FROM V_REAL_PLAYER_MARKET_VALUE)
  AND bursa_current_price < (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY bursa_current_price)
                             FROM V_REAL_PLAYER_MARKET_VALUE)
ORDER BY salary DESC
LIMIT 15;

-- שאילתה 2.2: שווי שוק מצטבר לפי קבוצה - אילו קבוצות בעולם האמיתי
-- מחזיקות את השחקנים היקרים ביותר בבורסה, וכמה תנודתי המחיר שלהם.
SELECT teamname,
       COUNT(*)                                     AS mapped_players,
       ROUND(AVG(bursa_current_price), 2)           AS avg_bursa_price,
       SUM(bursa_current_price)                     AS total_bursa_value,
       ROUND(AVG(bursa_max_price - bursa_min_price), 2) AS avg_price_volatility
FROM V_REAL_PLAYER_MARKET_VALUE
GROUP BY teamname
HAVING COUNT(*) >= 3
ORDER BY total_bursa_value DESC
LIMIT 15;
