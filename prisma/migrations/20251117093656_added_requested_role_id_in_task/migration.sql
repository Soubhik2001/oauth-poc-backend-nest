/*
  Warnings:

  - You are about to drop the column `requestedRole` on the `Task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "requestedRole",
ADD COLUMN     "requestedRoleId" INTEGER;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_requestedRoleId_fkey" FOREIGN KEY ("requestedRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
