-- ====================================================================
-- שלב ד: פרוצדורות
-- מגישים: אביאל כהן, נתנאל דהן
-- ====================================================================

-- --------------------------------------------------------------------
-- פרוצדורה 1: prc_process_round_price_update
-- --------------------------------------------------------------------
-- מטרה: לעדכן את מחירי כל שחקני הבורסה בהתבסס על ביצועיהם האמיתיים
-- (שערים, בישולים, טאקלים) מהמערכת שהתקבלה בשלב ג, דרך טבלת הגישור
-- PLAYER_MAPPING. שחקן שביצועיו מעל הממוצע - מחירו עולה, מתחת
-- לממוצע - מחירו יורד. הפרוצדורה מבצעת אך ורק UPDATE ל-PLAYERS;
-- טבלת PRICE_HISTORY מתעדכנת אוטומטית ע"י הטריגר trg_players_price_history
-- (הפרדת אחריות - ראו הסבר בדוח).
-- --------------------------------------------------------------------

CREATE OR REPLACE PROCEDURE prc_process_round_price_update()
LANGUAGE plpgsql
AS $$
DECLARE
    v_avg_score     NUMERIC;
    v_pct_change    NUMERIC;
    v_new_price     INT;
    v_updated_count INT := 0;

    -- Cursor מפורש: לכל שחקן בבורסה שממופה לשחקן אמיתי - ציון ביצועים
    -- מצטבר (סכימת שערים/בישולים/טאקלים על פני כל המשחקים).
    c_players CURSOR FOR
        SELECT b.Player_ID,
               b.Current_Price,
               COALESCE(SUM(pms.goals),   0) * 300 +
               COALESCE(SUM(pms.assists), 0) * 150 +
               COALESCE(SUM(pms.tackles), 0) * 20  AS perf_score
        FROM PLAYERS b
        JOIN PLAYER_MAPPING m   ON m.bursa_player_id = b.Player_ID
        LEFT JOIN PLAYERMATCHSTATS pms ON pms.playerid = m.real_player_id
        GROUP BY b.Player_ID, b.Current_Price;

    v_rec RECORD;
BEGIN
    -- Cursor מרומז (SELECT INTO) - ממוצע ציון הביצועים על פני כלל השחקנים הממופים
    SELECT AVG(perf_score) INTO v_avg_score
    FROM (
        SELECT COALESCE(SUM(pms.goals),   0) * 300 +
               COALESCE(SUM(pms.assists), 0) * 150 +
               COALESCE(SUM(pms.tackles), 0) * 20  AS perf_score
        FROM PLAYERS b
        JOIN PLAYER_MAPPING m   ON m.bursa_player_id = b.Player_ID
        LEFT JOIN PLAYERMATCHSTATS pms ON pms.playerid = m.real_player_id
        GROUP BY b.Player_ID
    ) sub;

    IF v_avg_score IS NULL OR v_avg_score = 0 THEN
        RAISE EXCEPTION 'לא ניתן לחשב ממוצע ביצועים - אין נתוני PLAYERMATCHSTATS ממופים';
    END IF;

    OPEN c_players;
    LOOP
        FETCH c_players INTO v_rec;
        EXIT WHEN NOT FOUND;

        -- הסתעפות: אחוז שינוי יחסי לממוצע, מוגבל ל-±20% כדי למנוע קפיצות קיצוניות
        v_pct_change := (v_rec.perf_score - v_avg_score) / v_avg_score * 0.2;
        IF v_pct_change > 0.2 THEN
            v_pct_change := 0.2;
        ELSIF v_pct_change < -0.2 THEN
            v_pct_change := -0.2;
        END IF;

        v_new_price := ROUND(v_rec.Current_Price * (1 + v_pct_change));

        -- הסתעפות: הבטחת גבולות המחיר החוקיים (4000-20000)
        IF v_new_price < 4000 THEN
            v_new_price := 4000;
        ELSIF v_new_price > 20000 THEN
            v_new_price := 20000;
        END IF;

        -- DML: עדכון מחיר השחקן - הטריגר ידאג לתיעוד ההיסטוריה
        UPDATE PLAYERS SET Current_Price = v_new_price WHERE Player_ID = v_rec.Player_ID;
        v_updated_count := v_updated_count + 1;
    END LOOP;
    CLOSE c_players;

    RAISE NOTICE 'סגירת מחזור הושלמה: % שחקנים עודכנו (ממוצע ביצועים: %)', v_updated_count, ROUND(v_avg_score, 1);

EXCEPTION
    WHEN OTHERS THEN
        IF c_players%ISOPEN THEN
            CLOSE c_players;
        END IF;
        RAISE;
END;
$$;


-- --------------------------------------------------------------------
-- פרוצדורה 2: prc_execute_trade
-- --------------------------------------------------------------------
-- מטרה: ביצוע עסקת קנייה/מכירה שלמה עבור משתמש ושחקן נתונים.
-- מנסה להכניס רשומה ל-TRANSACTIONS; הטריגר trg_transactions_validate
-- בודק שם תקציב/בעלות ועשוי לזרוק חריגה. הפרוצדורה תופסת חריגה זו
-- (בלוק EXCEPTION מקונן) ומדווחת בלי לקרוס. אם ההוספה הצליחה,
-- מבצעת את שאר החישוב הכלכלי בפועל (עדכון תקציב + סגל).
-- --------------------------------------------------------------------

CREATE OR REPLACE PROCEDURE prc_execute_trade(
    p_user_id     INT,
    p_player_id   INT,
    p_action_type VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_price     PLAYERS.Current_Price%TYPE;
    v_tx_id     INT;
    v_squad_id  INT;
BEGIN
    -- Cursor מרומז (SELECT INTO) - מחיר השחקן הנוכחי
    SELECT Current_Price INTO v_price FROM PLAYERS WHERE Player_ID = p_player_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'שחקן % אינו קיים במערכת', p_player_id;
    END IF;

    v_tx_id := (SELECT COALESCE(MAX(Transaction_ID), 0) + 1 FROM TRANSACTIONS);

    -- בלוק מקונן: תופס חריגה שנזרקת ע"י טריגר trg_transactions_validate
    BEGIN
        INSERT INTO TRANSACTIONS (Transaction_ID, Transaction_Time, Action_Type, Transaction_Price, User_ID, Player_ID)
        VALUES (v_tx_id, NOW(), UPPER(p_action_type), v_price, p_user_id, p_player_id);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'העסקה נדחתה ע"י בסיס הנתונים: %', SQLERRM;
            RETURN;
    END;

    -- אם הגענו לכאן - ה-INSERT הצליח, הטריגר אישר את העסקה. מבצעים בפועל.
    IF UPPER(p_action_type) = 'BUY' THEN
        UPDATE USERS SET Current_Budget = Current_Budget - v_price WHERE User_ID = p_user_id;

        v_squad_id := (SELECT COALESCE(MAX(Squad_Record_ID), 0) + 1 FROM USER_SQUADS);
        INSERT INTO USER_SQUADS (Squad_Record_ID, Lineup_Status, User_ID, Player_ID)
        VALUES (v_squad_id, 'Bench', p_user_id, p_player_id);

        RAISE NOTICE 'קנייה בוצעה בהצלחה: משתמש % קנה שחקן % במחיר %', p_user_id, p_player_id, v_price;

    ELSIF UPPER(p_action_type) = 'SELL' THEN
        UPDATE USERS SET Current_Budget = Current_Budget + v_price WHERE User_ID = p_user_id;
        DELETE FROM USER_SQUADS WHERE User_ID = p_user_id AND Player_ID = p_player_id;

        RAISE NOTICE 'מכירה בוצעה בהצלחה: משתמש % מכר שחקן % במחיר %', p_user_id, p_player_id, v_price;

    ELSE
        RAISE EXCEPTION 'סוג פעולה לא תקין: %', p_action_type;
    END IF;
END;
$$;
