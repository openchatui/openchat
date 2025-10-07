-- CreateTable
CREATE TABLE "model" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "base_model_id" TEXT,
    "name" TEXT NOT NULL,
    "meta" TEXT NOT NULL,
    "params" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "access_control" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "model_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "model_base_model_id_fkey" FOREIGN KEY ("base_model_id") REFERENCES "model" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
