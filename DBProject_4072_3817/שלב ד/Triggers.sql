-- ====================================================================
-- שלב ד: טריגרים
-- מגישים: אביאל כהן, נתנאל דהן
-- ====================================================================

-- --------------------------------------------------------------------
-- טריגר 1: trg_players_price_history
-- --------------------------------------------------------------------
-- מטרה: בכל פעם שמחיר שחקן (PLAYERS.Current_Price) מתעדכן, ליצור
-- אוטומטית רשומת PRICE_HISTORY עבור הסבב הפעיל (Active). כך נמנעת
-- כפילות לוגית - אף תוכנית לא צריכה "לזכור" להזין את ההיסטוריה בנפרד,
-- כל UPDATE על המחיר מתועד באופן מרכזי דרך הטריגר.
-- מופעל על UPDATE (עומד בדרישה: לפחות טריגר אחד על UPDATE).
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_trg_log_price_history()
RETURNS TRIGGER AS $$
DECLARE
    v_round_id PRICE_HISTORY.Round_ID%TYPE;
BEGIN
    -- רק אם המחיר בפועל השתנה
    IF NEW.Current_Price IS DISTINCT FROM OLD.Current_Price THEN

        -- Cursor מרומז (implicit) - SELECT INTO של הסבב הפעיל הנוכחי
        SELECT Round_ID INTO v_round_id
        FROM ROUNDS
        WHERE Status = 'Active'
        ORDER BY Round_Number DESC
        LIMIT 1;

        -- הסתעפות: אם אין סבב פעיל, ניפול לסבב האחרון שנוצר (fallback)
        IF v_round_id IS NULL THEN
            SELECT Round_ID INTO v_round_id
            FROM ROUNDS
            ORDER BY Round_Number DESC
            LIMIT 1;
        END IF;

        -- אם אין אף סבב במערכת - שגיאה מפורשת
        IF v_round_id IS NULL THEN
            RAISE EXCEPTION 'לא ניתן לתעד היסטוריית מחיר: לא קיים אף סבב בטבלת ROUNDS';
        END IF;

        INSERT INTO PRICE_HISTORY (History_ID, Recorded_Price, Player_ID, Round_ID)
        VALUES (
            (SELECT COALESCE(MAX(History_ID), 0) + 1 FROM PRICE_HISTORY),
            NEW.Current_Price,
            NEW.Player_ID,
            v_round_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_players_price_history ON PLAYERS;
CREATE TRIGGER trg_players_price_history
AFTER UPDATE ON PLAYERS
FOR EACH ROW
EXECUTE FUNCTION fn_trg_log_price_history();


-- --------------------------------------------------------------------
-- טריגר 2: trg_transactions_validate
-- --------------------------------------------------------------------
-- מטרה: הגנה כפולה (Defense in Depth) ברמת בסיס הנתונים, בנוסף
-- לבדיקות שכבר קיימות בשרת ה-Node.js. לפני כל INSERT לטבלת
-- TRANSACTIONS:
--   BUY  - מוודא שלמשתמש יש תקציב מספיק.
--   SELL - מוודא שהמשתמש אכן מחזיק את השחקן בסגלו.
-- כל הפרה זורקת חריגה (RAISE EXCEPTION) שעוצרת את העסקה.
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_trg_validate_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_budget    USERS.Current_Budget%TYPE;
    v_owns_cnt  INT;
BEGIN
    IF NEW.Action_Type = 'BUY' THEN

        -- Cursor מרומז - שליפת התקציב הנוכחי של המשתמש
        SELECT Current_Budget INTO v_budget
        FROM USERS
        WHERE User_ID = NEW.User_ID;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'משתמש % אינו קיים במערכת', NEW.User_ID;
        ELSIF v_budget < NEW.Transaction_Price THEN
            RAISE EXCEPTION 'תקציב לא מספיק למשתמש % (תקציב: %, מחיר עסקה: %)',
                NEW.User_ID, v_budget, NEW.Transaction_Price;
        END IF;

    ELSIF NEW.Action_Type = 'SELL' THEN

        SELECT COUNT(*) INTO v_owns_cnt
        FROM USER_SQUADS
        WHERE User_ID = NEW.User_ID AND Player_ID = NEW.Player_ID;

        IF v_owns_cnt = 0 THEN
            RAISE EXCEPTION 'משתמש % אינו מחזיק בשחקן % - לא ניתן למכור', NEW.User_ID, NEW.Player_ID;
        END IF;

    ELSE
        RAISE EXCEPTION 'סוג פעולה לא מוכר: %', NEW.Action_Type;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transactions_validate ON TRANSACTIONS;
CREATE TRIGGER trg_transactions_validate
BEFORE INSERT ON TRANSACTIONS
FOR EACH ROW
EXECUTE FUNCTION fn_trg_validate_transaction();
