import { prisma } from "../../config/database.js";
import { AlerteRepository } from "./alert.repository.js";
import { ConfigurationRepository } from "../configuration/configuration.repository.js";
import { NotFoundError, ForbiddenError } from "../../shared/errors/AppError.js";

const alerteRepo = new AlerteRepository();
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

export class AlerteService {
  // ─── Détection — échéance qui approche ───────────────────────────
  // Une cotisation EN_ATTENTE datée exactement à (délai - 1) jours dans
  // le passé signifie qu'il reste 1 jour avant le passage en RETARD.
  async detecterEcheances() {
    const config = await getConfigOrThrow();

    const seuil = new Date();
    seuil.setHours(0, 0, 0, 0);
    seuil.setDate(seuil.getDate() - (config.delaiRegularisationJours - 1));

    const concernes = await prisma.cotisation.findMany({
      where: { statut: "EN_ATTENTE", date: seuil },
      select: { membreId: true },
      distinct: ["membreId"],
    });

    let count = 0;
    for (const { membreId } of concernes) {
      const dejaEnvoyee = await alerteRepo.existsToday(membreId, "ECHEANCE");
      if (dejaEnvoyee) continue;

      await alerteRepo.create({
        membreId,
        type: "ECHEANCE",
        destinataire: "MEMBRE",
        message: `Votre délai de régularisation approche (1 jour restant avant le seuil de ${config.delaiRegularisationJours} jour(s)). Merci de régulariser votre cotisation.`,
      });
      count++;
    }

    return { count };
  }

  // ─── Détection — retard critique (déjà BLOQUE via le module soldes) ─
  async detecterRetards() {
    const membresBloques = await prisma.membre.findMany({
      where: { statut: "BLOQUE" },
      select: { id: true, nom: true, prenom: true, matricule: true },
    });

    let count = 0;
    for (const membre of membresBloques) {
      const dejaEnvoyee = await alerteRepo.existsToday(membre.id, "RETARD");
      if (dejaEnvoyee) continue;

      await alerteRepo.create({
        membreId: membre.id,
        type: "RETARD",
        destinataire: "LES_DEUX",
        message: `Retard critique — le compte de ${membre.prenom} ${membre.nom} (${membre.matricule}) est bloqué jusqu'à régularisation complète du solde.`,
      });
      count++;
    }

    return { count };
  }

  // ─── Consultation ─────────────────────────────────────────────────
  async mesAlertes(membreId, filters) {
    return alerteRepo.findByMembre(membreId, filters);
  }

  async monResume(membreId) {
    const nonLues = await alerteRepo.countUnread(membreId);
    return { nonLues };
  }

  async alertesTresorier(filters) {
    return alerteRepo.findForTresorier(filters);
  }

  async listAll(filters) {
    return alerteRepo.findManyFiltered(filters);
  }

  // ─── Marquer comme lue ────────────────────────────────────────────
  async marquerLue(id, requester) {
    const alerte = await alerteRepo.findById(id);
    if (!alerte) throw new NotFoundError("Alerte");

    const estDestinataireMembre =
      alerte.membreId === requester.id &&
      ["MEMBRE", "LES_DEUX"].includes(alerte.destinataire);
    const estAdmin = requester.role === "ADMIN";

    if (!estAdmin && !estDestinataireMembre) {
      throw new ForbiddenError(
        "Vous ne pouvez marquer comme lues que vos propres alertes",
      );
    }

    return alerteRepo.update(id, { estLue: true });
  }
}