/*
  Warnings:

  - You are about to drop the column `lastRead` on the `ChannelMember` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChannelMember" (
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,

    PRIMARY KEY ("channelId", "userId"),
    CONSTRAINT "ChannelMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChannelMember_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChannelMember" ("channelId", "isFavorite", "isMuted", "joinedAt", "leftAt", "role", "userId") SELECT "channelId", "isFavorite", "isMuted", "joinedAt", "leftAt", "role", "userId" FROM "ChannelMember";
DROP TABLE "ChannelMember";
ALTER TABLE "new_ChannelMember" RENAME TO "ChannelMember";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
