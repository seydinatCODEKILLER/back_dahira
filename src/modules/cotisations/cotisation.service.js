import { CotisationRepository } from "./cotisation.repository.js";
import { ConfigurationRepository } from "../configuration/configuration.repository.js";
import { SoldeService } from "../soldes/solde.service.js";
import { NotFoundError } from "../../shared/errors/AppError.js";

const cotisationRepo = new CotisationRepository();
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

// Normalise une date à minuit UTC pour matcher le stockage @db.Date
const toDateOnly = (value) => {
  const d = value ? new Date(value) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export class CotisationService {
  // ─── Génération quotidienne (à brancher sur le futur scheduler) ──
  async genererDuJour() {
    const config = await getConfigOrThrow();
    const today = toDateOnly();

    const result = await cotisationRepo.generateForDate(
      today,
      config.montantCotisationJournaliere,
    );

    return {
      message: `${result.count} cotisation(s) générée(s) pour le ${today.toISOString().slice(0, 10)}`,
      count: result.count,
    };
  }

  // ─── Détection des retards (à brancher sur le futur scheduler) ───
  async marquerRetards() {
    const config = await getConfigOrThrow();
    const result = await cotisationRepo.markOverdueAsRetard(
      config.delaiRegularisationJours,
    );

    // Recalcule le solde des membres concernés — c'est ce qui bascule
    // effectivement Membre.statut sur BLOQUE (cf. module soldes).
    await Promise.all(
      result.membreIds.map((id) => soldeService.recalculerPourMembre(id)),
    );

    return {
      message: `${result.count} cotisation(s) marquée(s) en retard critique`,
      count: result.count,
    };
  }

  // ─── Consultation — un membre (lui-même ou vu par l'admin) ───────
  async listForMembre(membreId, filters) {
    return cotisationRepo.findByMembre(membreId, {
      ...filters,
      dateDebut: filters.dateDebut ? toDateOnly(filters.dateDebut) : undefined,
      dateFin: filters.dateFin ? toDateOnly(filters.dateFin) : undefined,
    });
  }

  async getResume(membreId) {
    return cotisationRepo.getResume(membreId);
  }

  // ─── Consultation — vue d'ensemble admin ─────────────────────────
  async listAll(filters) {
    return cotisationRepo.findManyFiltered({
      ...filters,
      dateDebut: filters.dateDebut ? toDateOnly(filters.dateDebut) : undefined,
      dateFin: filters.dateFin ? toDateOnly(filters.dateFin) : undefined,
    });
  }
}