import { prisma } from "../../config/database.js";
import { BaseRepository } from "../../shared/base/base.repository.js";

export class CotisationRepository extends BaseRepository {
  constructor() {
    super(prisma.cotisation);
  }

  // ─── Génération quotidienne ─────────────────────────────────────
  // Crée une ligne pour chaque membre ACTIF, pour la date donnée.
  // skipDuplicates s'appuie sur la contrainte unique [membreId, date]
  // pour rester idempotent si on relance plusieurs fois pour le même jour.
  async generateForDate(date, montant) {
    const membresActifs = await prisma.membre.findMany({
      where: { statut: "ACTIF" },
      select: { id: true },
    });

    if (membresActifs.length === 0) {
      return { count: 0 };
    }

    // Un membre peut avoir payé une avance qui couvre cette date avant même
    // que la ligne du jour n'existe (ex: avance de 5 jours). Dans ce cas,
    // la ligne naît directement PAYE et rattachée à ce versement.
    const versementsCouvrants = await prisma.versement.findMany({
      where: {
        statut: "VALIDE",
        periodeDebut: { lte: date },
        periodeFin: { gte: date },
      },
      select: { id: true, membreId: true },
    });
    const versementParMembre = new Map(
      versementsCouvrants.map((v) => [v.membreId, v.id]),
    );

    const data = membresActifs.map((m) => {
      const versementId = versementParMembre.get(m.id) || null;
      return {
        membreId: m.id,
        date,
        montantDu: montant,
        statut: versementId ? "PAYE" : "EN_ATTENTE",
        versementId,
      };
    });

    return prisma.cotisation.createMany({ data, skipDuplicates: true });
  }

  // ─── Détection des retards ───────────────────────────────────────
  // Passe en RETARD toute cotisation EN_ATTENTE dont la date dépasse
  // le délai de régularisation autorisé (règle des 2 jours).
  async markOverdueAsRetard(delaiJours) {
    const seuil = new Date();
    seuil.setHours(0, 0, 0, 0);
    seuil.setDate(seuil.getDate() - delaiJours);

    const aRisque = await prisma.cotisation.findMany({
      where: { statut: "EN_ATTENTE", date: { lt: seuil } },
      select: { membreId: true },
      distinct: ["membreId"],
    });

    const result = await prisma.cotisation.updateMany({
      where: { statut: "EN_ATTENTE", date: { lt: seuil } },
      data: { statut: "RETARD" },
    });

    return { count: result.count, membreIds: aRisque.map((c) => c.membreId) };
  }

  // ─── Consultation — vue membre (soi-même ou vu par l'admin) ──────
  async findByMembre(
    membreId,
    { dateDebut, dateFin, statut, page = 1, limit = 31 },
  ) {
    const where = {
      membreId,
      ...(statut && { statut }),
      ...((dateDebut || dateFin) && {
        date: {
          ...(dateDebut && { gte: dateDebut }),
          ...(dateFin && { lte: dateFin }),
        },
      }),
    };

    return this.findManyPaginated(where, {
      page,
      limit,
      sort: { date: "desc" },
    });
  }

  // ─── Consultation — vue admin, toutes les cotisations ────────────
  async findManyFiltered({ statut, dateDebut, dateFin, page = 1, limit = 20 }) {
    const where = {
      ...(statut && { statut }),
      ...((dateDebut || dateFin) && {
        date: {
          ...(dateDebut && { gte: dateDebut }),
          ...(dateFin && { lte: dateFin }),
        },
      }),
    };

    return this.findManyPaginated(where, {
      page,
      limit,
      sort: { date: "desc" },
      include: {
        membre: {
          select: { id: true, matricule: true, nom: true, prenom: true },
        },
      },
    });
  }

  // ─── Résumé chiffré pour le tableau de bord d'un membre ──────────
  async getResume(membreId) {
    const [paye, enAttente, retard] = await Promise.all([
      prisma.cotisation.count({ where: { membreId, statut: "PAYE" } }),
      prisma.cotisation.count({ where: { membreId, statut: "EN_ATTENTE" } }),
      prisma.cotisation.count({ where: { membreId, statut: "RETARD" } }),
    ]);

    return { paye, enAttente, retard, total: paye + enAttente + retard };
  }
}
