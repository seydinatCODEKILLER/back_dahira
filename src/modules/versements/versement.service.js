import { prisma } from "../../config/database.js";
import { VersementRepository } from "./versement.repository.js";
import { ConfigurationRepository } from "../configuration/configuration.repository.js";
import { SoldeService } from "../soldes/solde.service.js";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from "../../shared/errors/AppError.js";
import logger from "../../config/logger.js";

const versementRepo = new VersementRepository();
const configRepo = new ConfigurationRepository();
const soldeService = new SoldeService();

const getConfigOrThrow = async () => {
  const config = await configRepo.getSingleton();
  if (!config) {
    throw new NotFoundError(
      "Configuration (lancez le seeder : npx prisma db seed)",
    );
  }
  return config;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// Traçabilité — §5 du cahier des charges. N'interrompt jamais l'opération
// principale si l'écriture d'audit échoue (juste logué).
const tracer = (action, entiteId, auteurId, details) =>
  prisma.auditLog
    .create({ data: { action, entite: "Versement", entiteId, auteurId, details } })
    .catch((err) => logger.logError(err, { context: "audit_log_versement" }));

// ─────────────────────────────────────────────────────────────────
// Marque PAYE chaque jour de la période couverte par un versement.
//
// IMPORTANT : contrairement à un simple `updateMany`, cette fonction
// CRÉE la ligne Cotisation si elle n'existe pas encore (cas d'une
// avance dont la période dépasse ce que la génération quotidienne a
// déjà produit), en plus de mettre à jour celles qui existent déjà.
// Sans ça, un versement d'avance sur des jours futurs non encore
// générés serait validé "à vide" : le Versement passe VALIDE mais
// aucune Cotisation n'est créée/mise à jour, et le Solde ne reflète
// jamais le paiement.
// ─────────────────────────────────────────────────────────────────
const marquerCotisationsPayeesSurPeriode = async (
  tx,
  membreId,
  periodeDebut,
  periodeFin,
  versementId,
  montantParJour,
) => {
  const dates = [];
  const cur = new Date(periodeDebut);
  while (cur <= periodeFin) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  await Promise.all(
    dates.map((date) =>
      tx.cotisation.upsert({
        where: { membreId_date: { membreId, date } },
        create: {
          membreId,
          date,
          montantDu: montantParJour,
          statut: "PAYE",
          versementId,
        },
        update: { statut: "PAYE", versementId },
      }),
    ),
  );
};

export class VersementService {
  // ─── Déclaration d'un versement (membre) ─────────────────────────
  async declarer(membreId, montant) {
    const config = await getConfigOrThrow();

    if (montant <= 0 || montant % config.montantCotisationJournaliere !== 0) {
      throw new BadRequestError(
        `Le montant doit être un multiple positif de ${config.montantCotisationJournaliere} FCFA`,
      );
    }

    const nombreJours = montant / config.montantCotisationJournaliere;

    if (nombreJours > config.seuilAvanceJoursMax) {
      throw new ForbiddenError(
        `Vous ne pouvez pas avancer plus de ${config.seuilAvanceJoursMax} jours en une seule fois`,
      );
    }

    const membre = await prisma.membre.findUnique({
      where: { id: membreId },
      select: { statut: true },
    });
    if (!membre) throw new NotFoundError("Membre");

    const periodeDebut = await versementRepo.getProchaineDateDisponible(membreId);
    const periodeFin = addDays(periodeDebut, nombreJours - 1);

    if (membre.statut === "BLOQUE") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (periodeFin > today) {
        throw new ForbiddenError(
          "Compte bloqué pour retard critique : ce versement dépasse la simple régularisation. Réduisez le montant pour ne couvrir que les jours déjà dus, ou contactez le trésorier.",
        );
      }
    }

    const versement = await versementRepo.create({
      membreId,
      montant,
      nombreJours,
      periodeDebut,
      periodeFin,
      statut: "EN_ATTENTE",
    });

    await tracer("VERSEMENT_DECLARE", versement.id, membreId, {
      montant,
      nombreJours,
      periodeDebut,
      periodeFin,
    });

    return versement;
  }

  // ─── Consultation ─────────────────────────────────────────────────
  async listForMembre(membreId, filters) {
    return versementRepo.findByMembre(membreId, filters);
  }

  async listAll(filters) {
    return versementRepo.findManyFiltered(filters);
  }

  async getById(id, requester) {
    const versement = await versementRepo.findByIdWithMembre(id);
    if (!versement) throw new NotFoundError("Versement");

    if (requester.role !== "ADMIN" && versement.membreId !== requester.id) {
      throw new ForbiddenError("Vous ne pouvez consulter que vos propres versements");
    }

    return versement;
  }

  // ─── Validation (réservé au trésorier/admin) ─────────────────────
  // Transaction atomique : on crée/rattache les cotisations existantes
  // (ou manquantes) de la période à ce versement (PAYE) ET on valide
  // le versement ensemble — jamais l'un sans l'autre.
  async valider(versementId, adminId) {
    const config = await getConfigOrThrow();
    const versement = await versementRepo.findById(versementId);
    if (!versement) throw new NotFoundError("Versement");
    if (versement.statut !== "EN_ATTENTE") {
      throw new ConflictError(
        `Ce versement a déjà été traité (statut actuel : ${versement.statut})`,
      );
    }

    const updatedVersement = await prisma.$transaction(async (tx) => {
      await marquerCotisationsPayeesSurPeriode(
        tx,
        versement.membreId,
        versement.periodeDebut,
        versement.periodeFin,
        versementId,
        config.montantCotisationJournaliere,
      );

      return tx.versement.update({
        where: { id: versementId },
        data: { statut: "VALIDE", valideParId: adminId, dateValidation: new Date() },
      });
    });

    await tracer("VERSEMENT_VALIDE", versementId, adminId, {
      membreId: versement.membreId,
      montant: versement.montant,
    });

    await soldeService.recalculerPourMembre(versement.membreId);

    return updatedVersement;
  }

  // ─── Rejet (réservé au trésorier/admin) ──────────────────────────
  async rejeter(versementId, adminId) {
    const versement = await versementRepo.findById(versementId);
    if (!versement) throw new NotFoundError("Versement");
    if (versement.statut !== "EN_ATTENTE") {
      throw new ConflictError(
        `Ce versement a déjà été traité (statut actuel : ${versement.statut})`,
      );
    }

    const updated = await versementRepo.update(versementId, {
      statut: "REJETE",
      valideParId: adminId,
      dateValidation: new Date(),
    });

    await tracer("VERSEMENT_REJETE", versementId, adminId, {
      membreId: versement.membreId,
      montant: versement.montant,
    });

    return updated;
  }

  // ─── Déclaration + validation directe par l'admin ────────────────
  // Cas d'usage : membre injoignable / sans connexion, mais l'admin
  // a physiquement reçu le paiement. Le versement est créé DÉJÀ VALIDÉ,
  // sans passer par EN_ATTENTE.
  async declarerEtValiderPourMembre(adminId, membreId, montant) {
    const config = await getConfigOrThrow();

    if (montant <= 0 || montant % config.montantCotisationJournaliere !== 0) {
      throw new BadRequestError(
        `Le montant doit être un multiple positif de ${config.montantCotisationJournaliere} FCFA`,
      );
    }

    const nombreJours = montant / config.montantCotisationJournaliere;

    if (nombreJours > config.seuilAvanceJoursMax) {
      throw new ForbiddenError(
        `Impossible d'avancer plus de ${config.seuilAvanceJoursMax} jours en une seule fois`,
      );
    }

    const membre = await prisma.membre.findUnique({
      where: { id: membreId },
      select: { statut: true },
    });
    if (!membre) throw new NotFoundError("Membre");

    const periodeDebut = await versementRepo.getProchaineDateDisponible(membreId);
    const periodeFin = addDays(periodeDebut, nombreJours - 1);

    if (membre.statut === "BLOQUE") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (periodeFin > today) {
        throw new ForbiddenError(
          "Compte bloqué pour retard critique : ce versement dépasse la simple régularisation. Réduisez le montant pour ne couvrir que les jours déjà dus.",
        );
      }
    }

    const versement = await prisma.$transaction(async (tx) => {
      const v = await tx.versement.create({
        data: {
          membreId, montant, nombreJours, periodeDebut, periodeFin,
          statut: "VALIDE", valideParId: adminId, dateValidation: new Date(),
        },
      });

      await marquerCotisationsPayeesSurPeriode(
        tx,
        membreId,
        periodeDebut,
        periodeFin,
        v.id,
        config.montantCotisationJournaliere,
      );

      return v;
    });

    await tracer("VERSEMENT_DECLARE_ET_VALIDE_PAR_ADMIN", versement.id, adminId, {
      membreId,
      montant,
      nombreJours,
      periodeDebut,
      periodeFin,
      raison: "Saisi par l'administrateur pour le compte du membre",
    });

    await soldeService.recalculerPourMembre(membreId);

    return versement;
  }
}