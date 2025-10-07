/*
  Warnings:

  - You are about to drop the `model` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "model";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Models" (
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
    CONSTRAINT "Models_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Models_base_model_id_fkey" FOREIGN KEY ("base_model_id") REFERENCES "Models" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
