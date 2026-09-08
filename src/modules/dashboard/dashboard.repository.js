import { prisma } from "../../config/database.js";
import { BaseRepository } from "../../shared/base/base.repository.js";

export class DashboardRepository extends BaseRepository {
  constructor() {
    super(prisma.membre); // La base de l'agrégation n'a pas d'importance ici
  }

  async getMembresStats() {
    return Promise.all([
      prisma.membre.count(),
      prisma.membre.count({ where: { statut: "ACTIF" } }),
      prisma.membre.count({ where: { statut: "BLOQUE" } }),
    ]);
  }

  async getCaisseStats() {
    const agregationCaisse = await prisma.versement.aggregate({
      _sum: { montant: true },
      _count: true,
      where: { statut: "VALIDE" },
    });

    const versementsEnAttente = await prisma.versement.count({
      where: { statut: "EN_ATTENTE" },
    });

    return {
      totalEncaisse: agregationCaisse._sum.montant || 0,
      totalVersementsValides: agregationCaisse._count,
      versementsEnAttenteValidation: versementsEnAttente,
    };
  }

  async getCotisationsJourStats(today) {
    return Promise.all([
      prisma.cotisation.count({ where: { date: today } }),
      prisma.cotisation.count({ where: { date: today, statut: "PAYE" } }),
      prisma.cotisation.count({ where: { date: today, statut: "EN_ATTENTE" } }),
    ]);
  }

  async getImpayesStats() {
    const cotisationsEnRetard = await prisma.cotisation.count({
      where: { statut: "RETARD" },
    });

    const sommeImpayes = await prisma.cotisation.aggregate({
      _sum: { montantDu: true },
      where: { statut: { in: ["EN_ATTENTE", "RETARD"] } },
    });

    return {
      cotisationsEnRetardCritique: cotisationsEnRetard,
      montantTotalEnAttente: sommeImpayes._sum.montantDu || 0,
    };
  }
}