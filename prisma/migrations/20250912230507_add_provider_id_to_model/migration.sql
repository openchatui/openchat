/*
  Warnings:

  - Added the required column `provider_id` to the `Models` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "base_model_id" TEXT,
    "name" TEXT NOT NULL,
    "meta" JSONB NOT NULL,
    "params" JSONB NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "access_control" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Models_base_model_id_fkey" FOREIGN KEY ("base_model_id") REFERENCES "Models" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Models_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Models" ("access_control", "base_model_id", "created_at", "id", "is_active", "meta", "name", "params", "updated_at", "user_id") SELECT "access_control", "base_model_id", "created_at", "id", "is_active", "meta", "name", "params", "updated_at", "user_id" FROM "Models";
DROP TABLE "Models";
ALTER TABLE "new_Models" RENAME TO "Models";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
