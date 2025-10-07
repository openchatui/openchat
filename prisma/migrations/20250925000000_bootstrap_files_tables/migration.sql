-- Bootstrap tables so that later redefinition migrations can run on fresh shadow DBs

CREATE TABLE IF NOT EXISTS "file" (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  meta JSON,
  created_at INTEGER NOT NULL,
  hash TEXT,
  data JSON,
  updated_at INTEGER,
  path TEXT,
  access_control JSON,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "folder" (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  items JSON,
  meta JSON,
  is_expanded BOOLEAN NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  data JSON,
  PRIMARY KEY (id, user_id)
);


