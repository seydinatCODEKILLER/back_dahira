import { prisma } from "../../config/database.js";
import { BaseRepository } from "../../shared/base/base.repository.js";

export class AlerteRepository extends BaseRepository {
  constructor() {
    super(prisma.alerte);
  }

  // ─── Vue membre — ses propres alertes ────────────────────────────
  async findByMembre(membreId, { type, estLue, page = 1, limit = 20 } = {}) {
    const where = {
      membreId,
      destinataire: { in: ["MEMBRE", "LES_DEUX"] },
      ...(type && { type }),
      ...(estLue !== undefined && { estLue }),
    };
    return this.findManyPaginated(where, {
      page,
      limit,
      sort: { dateEnvoi: "desc" },
    });
  }

  async countUnread(membreId) {
    return prisma.alerte.count({
      where: {
        membreId,
        destinataire: { in: ["MEMBRE", "LES_DEUX"] },
        estLue: false,
      },
    });
  }

  // ─── Vue trésorier — alertes qui lui sont destinées ──────────────
  async findForTresorier({ type, estLue, page = 1, limit = 20 } = {}) {
    const where = {
      destinataire: { in: ["TRESORIER", "LES_DEUX"] },
      ...(type && { type }),
      ...(estLue !== undefined && { estLue }),
    };
    return this.findManyPaginated(where, {
      page,
      limit,
      sort: { dateEnvoi: "desc" },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
      },
    });
  }

  // ─── Vue admin — historique complet (traçabilité §5) ─────────────
  async findManyFiltered({ membreId, type, destinataire, page = 1, limit = 20 } = {}) {
    const where = {
      ...(membreId && { membreId }),
      ...(type && { type }),
      ...(destinataire && { destinataire }),
    };
    return this.findManyPaginated(where, {
      page,
      limit,
      sort: { dateEnvoi: "desc" },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
      },
    });
  }

  // ─── Anti-doublon — une seule alerte d'un type donné par jour ────
  async existsToday(membreId, type) {
    const debut = new Date();
    debut.setHours(0, 0, 0, 0);
    const fin = new Date();
    fin.setHours(23, 59, 59, 999);

    const count = await prisma.alerte.count({
      where: { membreId, type, dateEnvoi: { gte: debut, lte: fin } },
    });
    return count > 0;
  }
}