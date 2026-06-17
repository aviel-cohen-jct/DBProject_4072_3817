-- ====================================================================
-- שלב ב: אילוצים (Constraints) חדשים
-- מגישים: אביאל כהן, נתנאל דהן
-- ====================================================================

-- --------------------------------------------------------------------
-- אילוץ 1: אורך שם משתמש (User_Name) חייב להיות לפחות 3 תווים
-- --------------------------------------------------------------------
ALTER TABLE USERS ADD CONSTRAINT chk_user_name_len CHECK (LENGTH(User_Name) >= 3);

-- בדיקת הפרת האילוץ (צפוי להיכשל בשגיאה):
-- INSERT INTO USERS (User_ID, User_Name, Current_Budget) VALUES (9999, 'ab', 100000);


-- --------------------------------------------------------------------
-- אילוץ 2: זמן ביצוע העסקה אינו יכול להיות בעתיד
-- --------------------------------------------------------------------
ALTER TABLE TRANSACTIONS ADD CONSTRAINT chk_tx_time_past CHECK (Transaction_Time <= NOW());

-- בדיקת הפרת האילוץ (צפוי להיכשל בשגיאה):
-- INSERT INTO TRANSACTIONS (Transaction_ID, Transaction_Time, Action_Type, Transaction_Price, User_ID, Player_ID)
-- VALUES (99999, NOW() + INTERVAL '1 day', 'BUY', 5000, 1, 1);


-- --------------------------------------------------------------------
-- אילוץ 3: שחקן יכול להופיע בסגל של משתמש מסוים לכל היותר פעם אחת (ייחודיות שילוב משתמש-שחקן)
-- --------------------------------------------------------------------
ALTER TABLE USER_SQUADS ADD CONSTRAINT uq_user_player UNIQUE (User_ID, Player_ID);

-- בדיקת הפרת האילוץ (צפוי להיכשל בשגיאה):
-- INSERT INTO USER_SQUADS (Squad_Record_ID, Lineup_Status, User_ID, Player_ID) VALUES (99999, 'Bench', 1, 1);
-- INSERT INTO USER_SQUADS (Squad_Record_ID, Lineup_Status, User_ID, Player_ID) VALUES (99998, 'Starter', 1, 1);
