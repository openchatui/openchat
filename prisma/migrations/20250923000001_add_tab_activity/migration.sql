-- CreateTable: tab_activity
CREATE TABLE IF NOT EXISTS "tab_activity" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "session_id" TEXT,
  "tab_id" TEXT NOT NULL,
  "last_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "path" TEXT,
  "user_agent" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "tab_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "tab_activity_user_id_tab_id_key" ON "tab_activity"("user_id", "tab_id");
CREATE INDEX IF NOT EXISTS "tab_activity_last_seen_at_idx" ON "tab_activity"("last_seen_at");

