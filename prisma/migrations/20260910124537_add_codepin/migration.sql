/*
  Warnings:

  - You are about to drop the column `motDePasse` on the `membres` table. All the data in the column will be lost.
  - Added the required column `codePin` to the `membres` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "membres" DROP COLUMN "motDePasse",
ADD COLUMN     "codePin" TEXT NOT NULL;
