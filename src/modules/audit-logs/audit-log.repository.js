import { prisma } from "../../config/database.js";
import { BaseRepository } from "../../shared/base/base.repository.js";

export class AuditLogRepository extends BaseRepository {
  constructor() {
    super(prisma.auditLog);
  }

  async findManyFiltered({
    auteurId,
    entite,
    action,
    dateDebut,
    dateFin,
    page = 1,
    limit = 50,
  } = {}) {
    const where = {
      ...(auteurId && { auteurId }),
      ...(entite && { entite }),
      ...(action && { action }),
      ...((dateDebut || dateFin) && {
        createdAt: {
          ...(dateDebut && { gte: dateDebut }),
          ...(dateFin && { lte: dateFin }),
        },
      }),
    };

    // On inclut l'auteur pour afficher son nom dans l'interface d'administration
    return this.findManyPaginated(where, {
      page,
      limit,
      sort: { createdAt: "desc" }, // Du plus récent au plus ancien
      include: {
        auteur: {
          select: {
            id: true,
            matricule: true,
            nom: true,
            prenom: true,
            role: true,
          },
        },
      },
    });
  }
}
