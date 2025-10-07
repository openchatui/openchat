-- CreateTable
CREATE TABLE "group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "name" TEXT,
    "description" TEXT,
    "data" JSONB,
    "meta" JSONB,
    "permissions" JSONB,
    "user_ids" JSONB,
    "created_at" INTEGER,
    "updated_at" INTEGER,
    CONSTRAINT "group_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
