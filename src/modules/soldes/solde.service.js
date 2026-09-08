import { prisma } from "../../config/database.js";
import { SoldeRepository } from "./solde.repository.js";
import { ConfigurationRepository } from "../configuration/configuration.repository.js";
import { NotFoundError } from "../../shared/errors/AppError.js";

const soldeRepo = new SoldeRepository();
const configRepo = new ConfigurationRepository();

const getConfigOrThrow = async () => {
  const config = await configRepo.getSingleton();
  if (!config) {
    throw new NotFoundError(
      "Configuration (lancez le seeder : npx prisma db seed)",
    );
  }
  return config;
};

const toDateOnly = (value) => {
  const d = value ? new Date(value) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Synchronise Membre.statut avec le solde calculé — uniquement entre ACTIF
// et BLOQUE. On ne touche jamais à INACTIF (décision admin manuelle, cf. §15.3).
const syncMembreStatut = async (membreId, soldeStatut) => {
  const membre = await prisma.membre.findUnique({
    where: { id: membreId },
    select: { statut: true },
  });
  if (!membre || membre.statut === "INACTIF") return;

  if (soldeStatut === "BLOQUE" && membre.statut !== "BLOQUE") {
    await prisma.membre.update({
      where: { id: membreId },
      data: { statut: "BLOQUE" },
    });
  } else if (soldeStatut !== "BLOQUE" && membre.statut === "BLOQUE") {
    await prisma.membre.update({
      where: { id: membreId },
      data: { statut: "ACTIF" },
    });
  }
};

export class SoldeService {
  // ─── Recalcul (cœur du module) ───────────────────────────────────
  // soldeJours = jours payés (PAYE, y compris avances futures) - jours dus
  // (toute ligne Cotisation dont la date est déjà passée/aujourd'hui).
  // Le statut BLOQUE reflète directement l'existence de cotisations en
  // statut RETARD (déjà marquées comme telles par cotisation.marquerRetards
  // selon le délai de régularisation configuré — règle des 2 jours).
  async recalculerPourMembre(membreId) {
    const config = await getConfigOrThrow();
    const today = toDateOnly();

    const [joursDus, joursPayes, joursRetardCritique, dernierPaye] =
      await Promise.all([
        prisma.cotisation.count({ where: { membreId, date: { lte: today } } }),
        prisma.cotisation.count({ where: { membreId, statut: "PAYE" } }),
        prisma.cotisation.count({ where: { membreId, statut: "RETARD" } }),
        prisma.cotisation.findFirst({
          where: { membreId, statut: "PAYE" },
          orderBy: { date: "desc" },
          select: { date: true },
        }),
      ]);

    const soldeJours = joursPayes - joursDus;
    const soldeMontant = soldeJours * config.montantCotisationJournaliere;

    let statut;
    if (joursRetardCritique > 0) statut = "BLOQUE";
    else if (soldeJours < 0) statut = "EN_RETARD";
    else if (soldeJours > 0) statut = "EN_AVANCE";
    else statut = "A_JOUR";

    const solde = await soldeRepo.upsert(membreId, {
      soldeJours,
      soldeMontant,
      dernierJourPaye: dernierPaye?.date || null,
      statut,
    });

    await syncMembreStatut(membreId, statut);

    return solde;
  }

  // Recalcule tous les membres actifs/bloqués — déclencheur manuel en
  // attendant le scheduler (module `jobs`).
  async recalculerTout() {
    const membres = await soldeRepo.getMembresActifsEtBloquesIds();
    const resultats = await Promise.all(
      membres.map((m) => this.recalculerPourMembre(m.id)),
    );
    return { count: resultats.length };
  }

  // ─── Consultation ─────────────────────────────────────────────────
  async getForMembre(membreId) {
    const solde = await soldeRepo.findByMembre(membreId);
    if (!solde) {
      // Pas encore calculé (ex : membre tout juste inscrit) → calcul à la volée
      return this.recalculerPourMembre(membreId);
    }
    return solde;
  }

  async listAll(filters) {
    return soldeRepo.findManyFiltered(filters);
  }
}
