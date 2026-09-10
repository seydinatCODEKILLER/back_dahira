-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBRE');

-- CreateEnum
CREATE TYPE "StatutMembre" AS ENUM ('ACTIF', 'INACTIF', 'BLOQUE');

-- CreateEnum
CREATE TYPE "StatutVersement" AS ENUM ('EN_ATTENTE', 'VALIDE', 'REJETE');

-- CreateEnum
CREATE TYPE "StatutCotisation" AS ENUM ('PAYE', 'EN_ATTENTE', 'RETARD');

-- CreateEnum
CREATE TYPE "StatutSolde" AS ENUM ('A_JOUR', 'EN_AVANCE', 'EN_RETARD', 'BLOQUE');

-- CreateEnum
CREATE TYPE "TypeAlerte" AS ENUM ('ECHEANCE', 'RETARD');

-- CreateEnum
CREATE TYPE "DestinataireAlerte" AS ENUM ('MEMBRE', 'TRESORIER', 'LES_DEUX');

-- CreateTable
CREATE TABLE "membres" (
    "id" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "avatar" TEXT,
    "motDePasse" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBRE',
    "statut" "StatutMembre" NOT NULL DEFAULT 'ACTIF',
    "dateInscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateDesactivation" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuration" (
    "id" TEXT NOT NULL,
    "montantCotisationJournaliere" INTEGER NOT NULL DEFAULT 100,
    "seuilAvanceJoursMax" INTEGER NOT NULL DEFAULT 30,
    "delaiRegularisationJours" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versements" (
    "id" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "nombreJours" INTEGER NOT NULL,
    "periodeDebut" TIMESTAMP(3) NOT NULL,
    "periodeFin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutVersement" NOT NULL DEFAULT 'EN_ATTENTE',
    "valideParId" TEXT,
    "dateValidation" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "versements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotisations" (
    "id" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "montantDu" INTEGER NOT NULL DEFAULT 100,
    "statut" "StatutCotisation" NOT NULL DEFAULT 'EN_ATTENTE',
    "versementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soldes" (
    "id" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "soldeJours" INTEGER NOT NULL DEFAULT 0,
    "soldeMontant" INTEGER NOT NULL DEFAULT 0,
    "dernierJourPaye" TIMESTAMP(3),
    "statut" "StatutSolde" NOT NULL DEFAULT 'A_JOUR',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soldes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertes" (
    "id" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "type" "TypeAlerte" NOT NULL,
    "destinataire" "DestinataireAlerte" NOT NULL DEFAULT 'MEMBRE',
    "message" TEXT NOT NULL,
    "estLue" BOOLEAN NOT NULL DEFAULT false,
    "dateEnvoi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "auteurId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membres_matricule_key" ON "membres"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "membres_telephone_key" ON "membres"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "membres_email_key" ON "membres"("email");

-- CreateIndex
CREATE INDEX "membres_statut_idx" ON "membres"("statut");

-- CreateIndex
CREATE INDEX "versements_membreId_idx" ON "versements"("membreId");

-- CreateIndex
CREATE INDEX "versements_statut_idx" ON "versements"("statut");

-- CreateIndex
CREATE INDEX "cotisations_membreId_statut_idx" ON "cotisations"("membreId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "cotisations_membreId_date_key" ON "cotisations"("membreId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "soldes_membreId_key" ON "soldes"("membreId");

-- CreateIndex
CREATE INDEX "alertes_membreId_idx" ON "alertes"("membreId");

-- CreateIndex
CREATE INDEX "alertes_type_idx" ON "alertes"("type");

-- CreateIndex
CREATE INDEX "audit_logs_entite_entiteId_idx" ON "audit_logs"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "audit_logs_auteurId_idx" ON "audit_logs"("auteurId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_membreId_idx" ON "refresh_tokens"("membreId");

-- AddForeignKey
ALTER TABLE "versements" ADD CONSTRAINT "versements_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "membres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versements" ADD CONSTRAINT "versements_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "membres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "membres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_versementId_fkey" FOREIGN KEY ("versementId") REFERENCES "versements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soldes" ADD CONSTRAINT "soldes_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "membres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "membres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "membres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "membres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
