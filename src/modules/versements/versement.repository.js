import { prisma } from "../../config/database.js";
import { BaseRepository } from "../../shared/base/base.repository.js";

export class VersementRepository extends BaseRepository {
  constructor() {
    super(prisma.versement);
  }

  // ─── Détermination de la période couverte par une nouvelle avance ─
  // Renvoie le premier jour non encore "réservé" pour ce membre :
  // le lendemain du dernier jour payé, OU le lendemain de la fin de
  // période du dernier versement en attente/validé — le plus tardif
  // des deux, jamais avant aujourd'hui.
  async getProchaineDateDisponible(membreId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [dernierJourPaye, dernierVersementReserve] = await Promise.all([
      prisma.cotisation.findFirst({
        where: { membreId, statut: "PAYE" },
        orderBy: { date: "desc" },
        select: { date: true },
      }),
      prisma.versement.findFirst({
        where: { membreId, statut: { in: ["EN_ATTENTE", "VALIDE"] } },
        orderBy: { periodeFin: "desc" },
        select: { periodeFin: true },
      }),
    ]);

    const candidats = [today];

    if (dernierJourPaye) {
      const lendemain = new Date(dernierJourPaye.date);
      lendemain.setDate(lendemain.getDate() + 1);
      candidats.push(lendemain);
    }

    if (dernierVersementReserve) {
      const lendemain = new Date(dernierVersementReserve.periodeFin);
      lendemain.setDate(lendemain.getDate() + 1);
      candidats.push(lendemain);
    }

    return candidats.reduce((max, d) => (d > max ? d : max));
  }

  async findByIdWithMembre(id) {
    return prisma.versement.findUnique({
      where: { id },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
      },
    });
  }

  async findByMembre(membreId, { statut, page = 1, limit = 20 } = {}) {
    const where = { membreId, ...(statut && { statut }) };
    return this.findManyPaginated(where, {
      page,
      limit,
      sort: { createdAt: "desc" },
    });
  }

  async findManyFiltered({ statut, membreId, page = 1, limit = 20 } = {}) {
    const where = { ...(statut && { statut }), ...(membreId && { membreId }) };
    return this.findManyPaginated(where, {
      page,
      limit,
      sort: { createdAt: "desc" },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
      },
    });
  }
}