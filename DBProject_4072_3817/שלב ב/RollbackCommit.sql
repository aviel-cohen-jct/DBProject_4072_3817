-- ====================================================================
-- שלב ב: הדגמת בקרת טרנזקציות (ROLLBACK ו-COMMIT)
-- מגישים: אביאל כהן, נתנאל דהן
-- ====================================================================

-- --------------------------------------------------------------------
-- הדגמה 1: בדיקת ROLLBACK (ביטול שינויים)
-- --------------------------------------------------------------------

-- 1. הצגת המצב הנוכחי של המשתמש (לפני השינוי)
SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID = 1;

-- 2. פתיחת טרנזקציה וביצוע העדכון
BEGIN;

UPDATE USERS 
SET Current_Budget = Current_Budget + 100000 
WHERE User_ID = 1;

-- 3. הצגת המצב הזמני בתוך הטרנזקציה (התקציב עודכן זמנית)
SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID = 1;

-- 4. ביטול הטרנזקציה
ROLLBACK;

-- 5. הצגת המצב לאחר ה-ROLLBACK (התקציב חזר לקדמותו)
SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID = 1;


-- --------------------------------------------------------------------
-- הדגמה 2: בדיקת COMMIT (שמירת שינויים)
-- --------------------------------------------------------------------

-- 1. הצגת המצב הנוכחי של המשתמש (לפני השינוי)
SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID = 1;

-- 2. פתיחת טרנזקציה וביצוע העדכון
BEGIN;

UPDATE USERS 
SET Current_Budget = Current_Budget + 50000 
WHERE User_ID = 1;

-- 3. הצגת המצב הזמני בתוך הטרנזקציה
SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID = 1;

-- 4. שמירת השינויים סופית
COMMIT;

-- 5. הצגת המצב לאחר ה-COMMIT (השינוי נשמר בהצלחה)
SELECT User_ID, User_Name, Current_Budget FROM USERS WHERE User_ID = 1;
