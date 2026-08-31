-- ============================================================
-- שלב ג' - אינטגרציה בשיטה ב' (טבלה מקשרת)
-- ============================================================
-- שיטה ב': שתי המערכות נשארות ללא שינוי באותו בסיס נתונים,
-- והחיבור ביניהן נעשה באמצעות טבלת גישור (Bridge Table) בלבד.
--
-- המערכת שלנו   ("בורסת השחקנים"): USERS, PLAYERS, ROUNDS,
--                                  PRICE_HISTORY, TRANSACTIONS, USER_SQUADS
-- המערכת שקיבלנו ("כדורגל עולם אמיתי"): PLAYER, GOALKEEPER, COACH, REFEREE,
--                                  TEAM, STADIUM, MATCH, MATCHTEAM, MATCHSTADIUM,
--                                  REFEREEAT, COACHEDBY, PLAYSFOR_PLAYER,
--                                  PLAYSFOR_GK, PLAYERMATCHSTATS, GKMATCHSTATS
--
-- הישות המשותפת לשתי המערכות היא "שחקן":
--   אצלנו:  PLAYERS(player_id)  - שחקן הנסחר בבורסה
--   אצלם:   PLAYER(playerid)    - שחקן בעולם האמיתי
-- ============================================================

-- ------------------------------------------------------------
-- 1. יצירת טבלת הגישור PLAYER_MAPPING
-- ------------------------------------------------------------
-- כל רשומה ממפה שחקן בורסה אחד לשחקן עולם-אמיתי אחד (קשר 1:1):
--   * המפתח הראשי המורכב מונע כפילויות של אותו זוג.
--   * UNIQUE על כל עמודה בנפרד מבטיח שכל שחקן מופיע פעם אחת לכל היותר
--     בכל צד (מיפוי חד-חד ערכי).
--   * מפתחות זרים לשתי המערכות שומרים על שלמות ההקשרים (Referential Integrity).

CREATE TABLE PLAYER_MAPPING (
    bursa_player_id INT NOT NULL,   -- מזהה השחקן במערכת שלנו  (PLAYERS)
    real_player_id  INT NOT NULL,   -- מזהה השחקן במערכת שקיבלנו (PLAYER)
    PRIMARY KEY (bursa_player_id, real_player_id),
    UNIQUE (bursa_player_id),
    UNIQUE (real_player_id),
    FOREIGN KEY (bursa_player_id) REFERENCES PLAYERS(player_id),
    FOREIGN KEY (real_player_id)  REFERENCES PLAYER(playerid)
);

-- ------------------------------------------------------------
-- 2. מילוי טבלת הגישור
-- ------------------------------------------------------------
-- בדיקת הנתונים העלתה כי מזהי השחקנים שלנו (1-500) כלולים במלואם
-- בטווח המזהים של המערכת שקיבלנו (1-2000), ולכן המיפוי מבוצע
-- לפי שוויון מזהים - זהה לאופן שבו הזוג השני מיפה מולנו
-- (אצלם: WHERE PersonID <= 500).

INSERT INTO PLAYER_MAPPING (bursa_player_id, real_player_id)
SELECT p_bursa.player_id, p_real.playerid
FROM PLAYERS p_bursa
JOIN PLAYER  p_real ON p_bursa.player_id = p_real.playerid;

-- ------------------------------------------------------------
-- 3. אימות
-- ------------------------------------------------------------
-- מספר הרשומות בטבלת הגישור (מצופה: 500)
SELECT COUNT(*) AS mapping_rows FROM PLAYER_MAPPING;

-- דוגמה: שחקן משתי המערכות דרך המיפוי
SELECT m.bursa_player_id,
       b.first_name || ' ' || b.last_name AS bursa_name,
       m.real_player_id,
       r.playername                        AS real_name
FROM PLAYER_MAPPING m
JOIN PLAYERS b ON b.player_id = m.bursa_player_id
JOIN PLAYER  r ON r.playerid  = m.real_player_id
ORDER BY m.bursa_player_id
LIMIT 10;
