-- AlterTable
ALTER TABLE "quack" ADD COLUMN     "parentId" TEXT,
ALTER COLUMN "text" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "quack_parentId_createdAt_idx" ON "quack"("parentId", "createdAt");

-- AddForeignKey
ALTER TABLE "quack" ADD CONSTRAINT "quack_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "quack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rules Prisma can't express (story.md, docs/adr/0001). Every existing row has
-- text and an author and no parent, so all three hold for data already there.

-- A placeholder (a deleted quack kept for its replies) has neither author nor
-- text; a live quack has both.
ALTER TABLE "quack" ADD CONSTRAINT "quack_placeholder_shape"
  CHECK (("userId" IS NULL) = ("text" IS NULL));

-- A placeholder has no mood, and a reply never has one.
ALTER TABLE "quack" ADD CONSTRAINT "quack_mood_only_on_live_top_level"
  CHECK ("mood" IS NULL OR ("userId" IS NOT NULL AND "parentId" IS NULL));

-- Replies are never placeholders: they have no replies to keep.
ALTER TABLE "quack" ADD CONSTRAINT "quack_reply_has_author"
  CHECK ("parentId" IS NULL OR "userId" IS NOT NULL);
