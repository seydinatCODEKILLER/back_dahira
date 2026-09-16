/*
  Warnings:

  - You are about to drop the column `declareParId` on the `versements` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "versements" DROP CONSTRAINT "versements_declareParId_fkey";

-- AlterTable
ALTER TABLE "versements" DROP COLUMN "declareParId";
