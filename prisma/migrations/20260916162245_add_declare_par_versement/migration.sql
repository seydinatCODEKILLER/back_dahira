-- AlterTable
ALTER TABLE "versements" ADD COLUMN     "declareParId" TEXT;

-- AddForeignKey
ALTER TABLE "versements" ADD CONSTRAINT "versements_declareParId_fkey" FOREIGN KEY ("declareParId") REFERENCES "membres"("id") ON DELETE SET NULL ON UPDATE CASCADE;
