import { prisma } from "../../config/database.js";
import { BaseRepository } from "../../shared/base/base.repository.js";

export class SoldeRepository extends BaseRepository {
  constructor() {
    super(prisma.solde);
  }

  async findByMembre(membreId) {
    return prisma.solde.findUnique({ where: { membreId } });
  }

  async upsert(membreId, data) {
    return prisma.solde.upsert({
      where: { membreId },
      create: { membreId, ...data },
      update: data,
    });
  }

  async findManyFiltered({ statut, page = 1, limit = 20 } = {}) {
    const where = { ...(statut && { statut }) };
    return this.findManyPaginated(where, {
      page,
      limit,
      sort: { updatedAt: "desc" },
      include: {
        membre: {
          select: {
            id: true,
            matricule: true,
            nom: true,
            prenom: true,
            statut: true,
          },
        },
      },
    });
  }

  // Membres à recalculer lors d'un passage global — on inclut les BLOQUE
  // pour pouvoir les débloquer automatiquement si leur solde s'est régularisé.
  async getMembresActifsEtBloquesIds() {
    return prisma.membre.findMany({
      where: { statut: { in: ["ACTIF", "BLOQUE"] } },
      select: { id: true },
    });
  }
}
