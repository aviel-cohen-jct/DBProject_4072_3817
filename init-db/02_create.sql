
CREATE TABLE USERS
(
  User_ID INT NOT NULL,
  User_Name VARCHAR(50) NOT NULL,
  Current_Budget INT NOT NULL,
  PRIMARY KEY (User_ID),
  CHECK (Current_Budget >= 0)
);

CREATE TABLE PLAYERS
(
  Player_ID INT NOT NULL,
  First_Name VARCHAR(50) NOT NULL,
  Last_Name VARCHAR(50) NOT NULL,
  Position VARCHAR(20) NOT NULL,
  Team_Name VARCHAR(50) NOT NULL,
  Current_Price INT NOT NULL,
  PRIMARY KEY (Player_ID),
  CHECK (Current_Price >= 4000 AND Current_Price <= 20000),
  CHECK (Position IN ('Goalkeeper', 'Defender', 'Midfielder', 'Attacker'))
);

CREATE TABLE ROUNDS
(
  Round_ID INT NOT NULL,
  Round_Number INT NOT NULL,
  Start_Date TIMESTAMP NOT NULL,
  End_Date TIMESTAMP NOT NULL,
  Status VARCHAR(20) NOT NULL,
  PRIMARY KEY (Round_ID),
  CHECK (Round_Number >= 1 AND Round_Number <= 36),
  CHECK (End_Date > Start_Date),
  CHECK (Status IN ('Upcoming', 'Active', 'Completed'))
);

CREATE TABLE PRICE_HISTORY
(
  History_ID INT NOT NULL,
  Recorded_Price INT NOT NULL,
  Player_ID INT NOT NULL,
  Round_ID INT NOT NULL,
  PRIMARY KEY (History_ID),
  FOREIGN KEY (Player_ID) REFERENCES PLAYERS(Player_ID),
  FOREIGN KEY (Round_ID) REFERENCES ROUNDS(Round_ID),
  CHECK (Recorded_Price >= 4000 AND Recorded_Price <= 20000)
);

CREATE TABLE TRANSACTIONS
(
  Transaction_ID INT NOT NULL,
  Transaction_Time TIMESTAMP NOT NULL,
  Action_Type VARCHAR(10) NOT NULL,
  Transaction_Price INT NOT NULL,
  User_ID INT NOT NULL,
  Player_ID INT NOT NULL,
  PRIMARY KEY (Transaction_ID),
  FOREIGN KEY (User_ID) REFERENCES USERS(User_ID),
  FOREIGN KEY (Player_ID) REFERENCES PLAYERS(Player_ID),
  CHECK (Action_Type IN ('BUY', 'SELL')),
  CHECK (Transaction_Price >= 4000 AND Transaction_Price <= 20000)
);

CREATE TABLE USER_SQUADS
(
  Squad_Record_ID INT NOT NULL,
  Lineup_Status VARCHAR(20) NOT NULL,
  User_ID INT NOT NULL,
  Player_ID INT NOT NULL,
  PRIMARY KEY (Squad_Record_ID),
  FOREIGN KEY (User_ID) REFERENCES USERS(User_ID),
  FOREIGN KEY (Player_ID) REFERENCES PLAYERS(Player_ID),
  CHECK (Lineup_Status IN ('Starter', 'Bench'))
);
