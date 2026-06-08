import random
from datetime import datetime, timedelta

# הגדרת כמויות הדרושות
NUM_TRANSACTIONS = 20000
NUM_PRICE_HISTORY = 20000
NUM_USER_SQUADS = 500

# פונקציה להגרלת תאריך רנדומלי בין 2012 להיום
def random_date(start_year=2012):
    start = datetime(start_year, 8, 25)
    end = datetime.now()
    delta = end - start
    random_second = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=random_second)

# יצירת קובץ ה-SQL
with open('massive_inserts.sql', 'w') as f:
    
    print("מתחיל לייצר עסקאות (20,000)...")
    f.write("-- הזרקת נתונים לטבלת עסקאות\n")
    f.write("INSERT INTO TRANSACTIONS (Transaction_ID, Transaction_Time, Action_Type, Transaction_Price, User_ID, Player_ID) VALUES\n")
    transactions = []
    for i in range(1, NUM_TRANSACTIONS + 1):
        t_time = random_date().strftime('%Y-%m-%d %H:%M:%S')
        action = random.choice(['BUY', 'SELL'])
        price = random.randint(4000, 20000)
        u_id = random.randint(1, 500)
        p_id = random.randint(1, 500)
        transactions.append(f"({i}, '{t_time}', '{action}', {price}, {u_id}, {p_id})")
    f.write(",\n".join(transactions) + ";\n\n")

    print("מתחיל לייצר היסטוריית מחירים (20,000)...")
    f.write("-- הזרקת נתונים לטבלת היסטוריית מחירים\n")
    f.write("INSERT INTO PRICE_HISTORY (History_ID, Recorded_Price, Player_ID, Round_ID) VALUES\n")
    history = []
    for i in range(1, NUM_PRICE_HISTORY + 1):
        price = random.randint(4000, 20000)
        p_id = random.randint(1, 500)
        r_id = random.randint(1, 504) # מספר המחזורים שיצרנו קודם
        history.append(f"({i}, {price}, {p_id}, {r_id})")
    f.write(",\n".join(history) + ";\n\n")
    
    print("מתחיל לייצר סגלי שחקנים (500)...")
    f.write("-- הזרקת נתונים לטבלת סגלים\n")
    f.write("INSERT INTO USER_SQUADS (Squad_Record_ID, Lineup_Status, User_ID, Player_ID) VALUES\n")
    squads = []
    for i in range(1, NUM_USER_SQUADS + 1):
        status = random.choice(['Starter', 'Bench'])
        u_id = random.randint(1, 500)
        p_id = random.randint(1, 500)
        squads.append(f"({i}, '{status}', {u_id}, {p_id})")
    f.write(",\n".join(squads) + ";\n")

print("העבודה הסתיימה! נוצר קובץ massive_inserts.sql עם 40,500 רשומות בסך הכל.")