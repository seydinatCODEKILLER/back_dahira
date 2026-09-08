import { DashboardRepository } from "./dashboard.repository.js";

const dashboardRepo = new DashboardRepository();

export class DashboardService {
  async getGlobalStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Récupération des données brutes depuis le repository
    const [membresStats, caisseStats, cotisationsJourStats, impayesStats] =
      await Promise.all([
        dashboardRepo.getMembresStats(),
        dashboardRepo.getCaisseStats(),
        dashboardRepo.getCotisationsJourStats(today),
        dashboardRepo.getImpayesStats(),
      ]);

    // 2. Destructuration pour une lecture claire
    const [totalMembres, membresActifs, membresBloques] = membresStats;
    const [cotisationsJourTotal, cotisationsJourPayees, cotisationsJourAttente] = cotisationsJourStats;

    // 3. Logique métier (Calcul du taux de recouvrement du jour)
    let tauxRecouvrementJour = 0;
    if (cotisationsJourTotal > 0) {
      tauxRecouvrementJour = Math.round(
        (cotisationsJourPayees / cotisationsJourTotal) * 100
      );
    }

    // 4. Formatage de la réponse finale
    return {
      membres: {
        total: totalMembres,
        actifs: membresActifs,
        bloques: membresBloques,
        inactifs: totalMembres - membresActifs - membresBloques,
      },
      caisse: caisseStats,
      cotisationsJour: {
        date: today.toISOString().slice(0, 10),
        totalDu: cotisationsJourTotal,
        payees: cotisationsJourPayees,
        enAttente: cotisationsJourAttente,
        tauxRecouvrement: `${tauxRecouvrementJour}%`,
      },
      impayes: impayesStats,
    };
  }
}