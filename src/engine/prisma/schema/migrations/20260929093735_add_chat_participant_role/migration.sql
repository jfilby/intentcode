/*
  Warnings:

  - Added the required column `role` to the `chat_participant` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_chat_participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chat_session_id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    CONSTRAINT "chat_participant_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chat_participant_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_chat_participant" ("chat_session_id", "id", "user_profile_id") SELECT "chat_session_id", "id", "user_profile_id" FROM "chat_participant";
DROP TABLE "chat_participant";
ALTER TABLE "new_chat_participant" RENAME TO "chat_participant";
CREATE INDEX "chat_participant_chat_session_id_idx" ON "chat_participant"("chat_session_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
