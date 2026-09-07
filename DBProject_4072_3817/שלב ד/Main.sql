-- ====================================================================
-- שלב ד: תוכניות ראשיות (בלוקים אנונימיים)
-- מגישים: אביאל כהן, נתנאל דהן
-- ====================================================================
-- כל בלוק מזמן פונקציה אחת ופרוצדורה אחת, ומדפיס תוצאות עם RAISE NOTICE.
-- ====================================================================

-- --------------------------------------------------------------------
-- תוכנית ראשית 1: תשואת סגל + ביצוע עסקת קנייה
-- --------------------------------------------------------------------
-- מזמנת את fn_calculate_portfolio_value (פונקציה) לפני ואחרי,
-- ואת prc_execute_trade (פרוצדורה) ביניהן - כדי להראות שהקנייה
-- אכן משפיעה על התשואה המחושבת.
-- --------------------------------------------------------------------

DO $$
DECLARE
    v_result t_portfolio_result;
BEGIN
    RAISE NOTICE '=== תוכנית ראשית 1: תשואת סגל + עסקת קנייה (משתמש 366) ===';

    v_result := fn_calculate_portfolio_value(366);
    RAISE NOTICE 'לפני הקנייה -> תקציב: % | שווי סגל: % | שווי כולל: % | תשואה: %',
        v_result.current_budget, v_result.squad_value, v_result.total_value, v_result.yield_percent || '%';

    CALL prc_execute_trade(366, 14, 'BUY');

    v_result := fn_calculate_portfolio_value(366);
    RAISE NOTICE 'אחרי הקנייה -> תקציב: % | שווי סגל: % | שווי כולל: % | תשואה: %',
        v_result.current_budget, v_result.squad_value, v_result.total_value, v_result.yield_percent || '%';
END $$;


-- --------------------------------------------------------------------
-- תוכנית ראשית 2: סגירת מחזור + הצגת היסטוריית עסקאות (REF CURSOR)
-- --------------------------------------------------------------------
-- מזמנת את prc_process_round_price_update (פרוצדורה) לעדכון מחירי
-- כלל השחקנים, ולאחר מכן את fn_get_user_transactions (פונקציה) -
-- מקבלת REF CURSOR ומדגימה מיצוי (FETCH) שלו שורה אחר שורה מטבלת
-- TRANSACTIONS (היסטוריית קניות/מכירות של המשתמש).
-- --------------------------------------------------------------------

DO $$
DECLARE
    v_cursor REFCURSOR;
    v_rec    RECORD;
    v_count  INT := 0;
BEGIN
    RAISE NOTICE '=== תוכנית ראשית 2: סגירת מחזור + היסטוריית עסקאות (משתמש 366) ===';

    CALL prc_process_round_price_update();

    v_cursor := fn_get_user_transactions(366);
    LOOP
        FETCH v_cursor INTO v_rec;
        EXIT WHEN NOT FOUND;

        v_count := v_count + 1;
        RAISE NOTICE 'עסקה #% | % | שחקן: % | מחיר: %',
            v_rec."transaction_id", v_rec."action_type", v_rec."player_name", v_rec."transaction_price";

        EXIT WHEN v_count >= 5;
    END LOOP;
    CLOSE v_cursor;

    RAISE NOTICE 'סה"כ הוצגו % עסקאות אחרונות', v_count;
END $$;
