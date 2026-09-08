import { prisma } from "../../config/database.js";
import { BaseRepository } from "../../shared/base/base.repository.js";

const MEMBRE_SAFE_SELECT = {
  id: true,
  matricule: true,
  nom: true,
  prenom: true,
  telephone: true,
  email: true,
  avatar: true,
  role: true,
  statut: true,
  dateInscription: true,
  dateDesactivation: true,
  createdAt: true,
  updatedAt: true,
};

export class MembreRepository extends BaseRepository {
  constructor() {
    super(prisma.membre);
  }

  async findManyFiltered({ statut, recherche, page = 1, limit = 20 }) {
    const where = {
      ...(statut && { statut }),
      ...(recherche && {
        OR: [
          { nom: { contains: recherche, mode: "insensitive" } },
          { prenom: { contains: recherche, mode: "insensitive" } },
          { matricule: { contains: recherche, mode: "insensitive" } },
          { telephone: { contains: recherche } },
        ],
      }),
    };

    return this.findManyPaginated(where, {
      page,
      limit,
      sort: { createdAt: "desc" },
      select: MEMBRE_SAFE_SELECT,
    });
  }

  async findByIdSafe(id) {
    return prisma.membre.findUnique({
      where: { id },
      select: MEMBRE_SAFE_SELECT,
    });
  }

  async findByTelephoneExcludingId(telephone, excludeId) {
    return prisma.membre.findFirst({
      where: { telephone, NOT: { id: excludeId } },
    });
  }

  async updateInfo(id, data) {
    return prisma.membre.update({
      where: { id },
      data,
      select: MEMBRE_SAFE_SELECT,
    });
  }

  async updateAvatar(id, avatarUrl) {
    return prisma.membre.update({
      where: { id },
      data: { avatar: avatarUrl },
      select: MEMBRE_SAFE_SELECT,
    });
  }
}