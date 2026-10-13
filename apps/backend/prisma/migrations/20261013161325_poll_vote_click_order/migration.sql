-- AlterTable
ALTER TABLE "poll_vote" ADD COLUMN     "clientId" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "clientSeq" INTEGER NOT NULL DEFAULT 0;
