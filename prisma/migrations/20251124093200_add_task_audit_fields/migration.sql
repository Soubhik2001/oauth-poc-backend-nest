-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "actionAt" TIMESTAMP(3),
ADD COLUMN     "actionById" INTEGER,
ADD COLUMN     "priority" TEXT,
ADD COLUMN     "state" TEXT NOT NULL DEFAULT 'open';

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_actionById_fkey" FOREIGN KEY ("actionById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
