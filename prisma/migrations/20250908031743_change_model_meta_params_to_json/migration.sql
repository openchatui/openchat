/*
  Warnings:

  - You are about to alter the column `meta` on the `model` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `params` on the `model` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_model" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "base_model_id" TEXT,
    "name" TEXT NOT NULL,
    "meta" JSONB NOT NULL,
    "params" JSONB NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "access_control" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "model_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "model_base_model_id_fkey" FOREIGN KEY ("base_model_id") REFERENCES "model" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_model" ("access_control", "base_model_id", "created_at", "id", "is_active", "meta", "name", "params", "updated_at", "user_id") SELECT "access_control", "base_model_id", "created_at", "id", "is_active", "meta", "name", "params", "updated_at", "user_id" FROM "model";
DROP TABLE "model";
ALTER TABLE "new_model" RENAME TO "model";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
