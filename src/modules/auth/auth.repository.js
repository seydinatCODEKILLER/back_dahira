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
  doitChangerPin: true,  // ← NOUVEAU
  dateInscription: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
};

export class AuthRepository extends BaseRepository {
  constructor() {
    super(prisma.membre);
  }

  async findByTelephone(telephone) {
    return prisma.membre.findUnique({ where: { telephone } });
  }

  async findById(id) {
    return prisma.membre.findUnique({ where: { id } });
  }

  async findByIdSafe(id) {
    return prisma.membre.findUnique({
      where: { id },
      select: MEMBRE_SAFE_SELECT,
    });
  }

  async countMembres() {
    return prisma.membre.count();
  }

  async createMembre(data) {
    return prisma.membre.create({
      data,
      // doitChangerPin: true est appliqué automatiquement par le défaut Prisma
      select: MEMBRE_SAFE_SELECT,
    });
  }

  async updateProfile(membreId, data) {
    return prisma.membre.update({
      where: { id: membreId },
      data,
      select: MEMBRE_SAFE_SELECT,
    });
  }

  // ─── Mettre à jour le code PIN ───
  // Le changement de PIN lève systématiquement l'obligation.
  async updateCodePin(membreId, nouveauCodePin) {
    return prisma.membre.update({
      where: { id: membreId },
      data: { codePin: nouveauCodePin, doitChangerPin: false },
      select: MEMBRE_SAFE_SELECT,
    });
  }

  async updateStatut(membreId, statut) {
    const data = { statut };
    if (statut === "ACTIF") {
      data.dateDesactivation = null;
    } else if (statut === "INACTIF") {
      data.dateDesactivation = new Date();
    }

    return prisma.membre.update({
      where: { id: membreId },
      data,
      select: MEMBRE_SAFE_SELECT,
    });
  }

  async updateLastLogin(id) {
    return prisma.membre.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async createRefreshToken(data) {
    return prisma.refreshToken.create({ data });
  }

  async findRefreshToken(token) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { membre: true },
    });
  }

  async revokeRefreshToken(token) {
    return prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });
  }

  async revokeAllMembreTokens(membreId) {
    return prisma.refreshToken.updateMany({
      where: { membreId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async cleanupTokens() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true, createdAt: { lt: yesterday } },
        ],
      },
    });
  }
}