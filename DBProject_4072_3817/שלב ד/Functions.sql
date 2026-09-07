-- ====================================================================
-- שלב ד: פונקציות
-- מגישים: אביאל כהן, נתנאל דהן
-- ====================================================================

-- --------------------------------------------------------------------
-- פונקציה 1: fn_calculate_portfolio_value
-- --------------------------------------------------------------------
-- מטרה: לחשב את שווי הסגל הכולל של משתמש (תקציב פנוי + שווי שחקנים
-- לפי מחיר נוכחי), לחשב את אחוז התשואה שלו ביחס לתקציב ההתחלתי
-- (Initial_Budget), ולעדכן את התוצאה בעמודת USERS.Portfolio_Yield.
-- מחזירה רשומה עם כל נתוני הביניים לצורך הצגה/דוח.
-- --------------------------------------------------------------------

DROP TYPE IF EXISTS t_portfolio_result CASCADE;
CREATE TYPE t_portfolio_result AS (
    user_id          INT,
    user_name        VARCHAR,
    current_budget   INT,
    squad_value      INT,
    total_value      INT,
    initial_budget   INT,
    yield_percent    NUMERIC
);

CREATE OR REPLACE FUNCTION fn_calculate_portfolio_value(p_user_id INT)
RETURNS t_portfolio_result AS $$
DECLARE
    v_user            USERS%ROWTYPE;
    v_squad_value      INT := 0;
    v_total_value       INT;
    v_yield          NUMERIC(8,2);
    v_result          t_portfolio_result;

    -- Cursor מפורש: כל השחקנים בסגל של המשתמש, עם המחיר הנוכחי שלהם
    c_squad CURSOR FOR
        SELECT p.Current_Price
        FROM USER_SQUADS us
        JOIN PLAYERS p ON p.Player_ID = us.Player_ID
        WHERE us.User_ID = p_user_id;

    v_price PLAYERS.Current_Price%TYPE;
BEGIN
    -- Cursor מרומז (SELECT INTO) - שליפת נתוני המשתמש
    SELECT * INTO v_user FROM USERS WHERE User_ID = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'משתמש % אינו קיים במערכת', p_user_id;
    END IF;

    -- מעבר עם Cursor מפורש על כל שחקני הסגל, וסכימת שוויים
    OPEN c_squad;
    LOOP
        FETCH c_squad INTO v_price;
        EXIT WHEN NOT FOUND;
        v_squad_value := v_squad_value + v_price;
    END LOOP;
    CLOSE c_squad;

    v_total_value := v_squad_value + v_user.Current_Budget;

    -- הסתעפות: מניעת חלוקה באפס (אם אי-פעם Initial_Budget = 0)
    IF v_user.Initial_Budget = 0 THEN
        v_yield := 0;
    ELSE
        v_yield := ROUND(
            (v_total_value - v_user.Initial_Budget)::NUMERIC / v_user.Initial_Budget * 100,
            2
        );
    END IF;

    -- DML: עדכון התשואה המחושבת בטבלת USERS
    UPDATE USERS
    SET Portfolio_Yield = v_yield
    WHERE User_ID = p_user_id;

    v_result := (
        p_user_id,
        v_user.User_Name,
        v_user.Current_Budget,
        v_squad_value,
        v_total_value,
        v_user.Initial_Budget,
        v_yield
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        IF c_squad%ISOPEN THEN
            CLOSE c_squad;
        END IF;
        RAISE;
END;
$$ LANGUAGE plpgsql;


-- --------------------------------------------------------------------
-- פונקציה 2: fn_get_user_transactions
-- --------------------------------------------------------------------
-- מטרה: להחזיר REF CURSOR הפתוח על היסטוריית העסקאות (קניות/מכירות)
-- של משתמש נתון, ממוין מהחדש לישן, עם שם השחקן המעורב בכל עסקה.
-- הקוד הקורא (בלוק אנונימי) אחראי למשוך (FETCH) את השורות בעצמו.
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_get_user_transactions(p_user_id INT)
RETURNS REFCURSOR AS $$
DECLARE
    v_cursor  REFCURSOR := 'user_tx_cursor';
    v_exists  INT;
BEGIN
    SELECT COUNT(*) INTO v_exists FROM USERS WHERE User_ID = p_user_id;
    IF v_exists = 0 THEN
        RAISE EXCEPTION 'משתמש % אינו קיים במערכת', p_user_id;
    END IF;

    OPEN v_cursor FOR
        SELECT t.Transaction_ID,
               t.Transaction_Time,
               t.Action_Type,
               t.Transaction_Price,
               p.First_Name || ' ' || p.Last_Name AS Player_Name
        FROM TRANSACTIONS t
        JOIN PLAYERS p ON p.Player_ID = t.Player_ID
        WHERE t.User_ID = p_user_id
        ORDER BY t.Transaction_Time DESC;

    RETURN v_cursor;
END;
$$ LANGUAGE plpgsql;
