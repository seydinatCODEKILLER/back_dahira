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

export class SoldeService {
  // ─── Recalcul (cœur du module) ───────────────────────────────────
  // soldeJours = jours payés (PAYE, y compris avances futures) - jours dus
  // (toute ligne Cotisation dont la date est déjà passée/aujourd'hui).
  //
  // Le retard n'entraîne plus aucun blocage : un membre avec des
  // cotisations en RETARD (délai de régularisation dépassé) ou un solde
  // négatif est simplement EN_RETARD. Membre.statut n'est plus jamais
  // modifié automatiquement ici — seul l'admin gère ACTIF / INACTIF.
  async recalculerPourMembre(membreId) {
    const config = await getConfigOrThrow();
    const today = toDateOnly();

    const [joursDus, joursPayes, joursEnRetard, dernierPaye] =
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
    if (joursEnRetard > 0 || soldeJours < 0) statut = "EN_RETARD";
    else if (soldeJours > 0) statut = "EN_AVANCE";
    else statut = "A_JOUR";

    return soldeRepo.upsert(membreId, {
      soldeJours,
      soldeMontant,
      dernierJourPaye: dernierPaye?.date || null,
      statut,
    });
  }

  // Recalcule tous les membres non désactivés (filet de sécurité hebdomadaire).
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

  // ─── Avance explicite (jours + période) ──────────────────────────
  // Renvoie l'état d'avance d'un membre : combien de jours d'avance,
  // et sur quelle période exacte (du lendemain d'aujourd'hui jusqu'au
  // dernier jour payé). Retourne des valeurs à zéro/null si le membre
  // n'est pas en avance (à jour ou en retard).
  async getStatutAvance(membreId) {
    const solde = await this.getForMembre(membreId);
    const today = toDateOnly();

    const joursAvance = solde.soldeJours > 0 ? solde.soldeJours : 0;

    let dateDebutAvance = null;
    let dateFinAvance = null;

    if (joursAvance > 0) {
      const debut = new Date(today);
      debut.setDate(debut.getDate() + 1);
      dateDebutAvance = debut;
      dateFinAvance = solde.dernierJourPaye;
    }

    return { joursAvance, dateDebutAvance, dateFinAvance };
  }
}