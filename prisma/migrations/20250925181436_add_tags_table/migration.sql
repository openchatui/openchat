-- CreateTable
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meta" JSONB,

    PRIMARY KEY ("id", "user_id"),
    CONSTRAINT "tag_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
