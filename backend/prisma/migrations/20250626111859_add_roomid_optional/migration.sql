-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "roomId" INTEGER;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "botEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
