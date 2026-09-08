import cron from "node-cron";
import { CotisationService } from "../../modules/cotisations/cotisation.service.js";
import { AlerteService } from "../../modules/alertes/alert.service.js";
import { SoldeService } from "../../modules/soldes/solde.service.js";
import logger from "../../config/logger.js";

const cotisationService = new CotisationService();
const alerteService = new AlerteService();
const soldeService = new SoldeService();

/**
 * Initialise tous les cron jobs de l'application.
 * À appeler au démarrage du serveur (dans app.js ou server.js).
 */
export const initScheduler = () => {
  logger.info("🔄 Initialisation du planificateur de tâches (Cron Jobs)...");

  // ━━━━━ Tâche 1 : Génération quotidienne des cotisations ━━━━━
  // S'exécute tous les jours à 00:05 (minuit et 5 minutes)
  cron.schedule("5 0 * * *", async () => {
    logger.info("⏳ [CRON 00:05] Génération des cotisations du jour...");
    try {
      const result = await cotisationService.genererDuJour();
      logger.info(`✅ [CRON] ${result.message}`);
    } catch (error) {
      logger.logError(error, { context: "CRON_GENERER_JOUR" });
    }
  });

  // ━━━━━ Tâche 2 : Marquer les retards critiques (Règle des 48h) ━━━━━
  // S'exécute tous les jours à 01:00 (1h du matin)
  // Pour éviter de surcharger le serveur en même temps que la génération
  cron.schedule("0 1 * * *", async () => {
    logger.info("⏳ [CRON 01:00] Détection des retards critiques (> 48h)...");
    try {
      const result = await cotisationService.marquerRetards();
      logger.info(`✅ [CRON] ${result.message}`);
    } catch (error) {
      logger.logError(error, { context: "CRON_MARQUER_RETARDS" });
    }
  });

  // ━━━━━ Tâche 3 : Détection des échéances (Alertes de prévention) ━━━━━
  // S'exécute tous les jours à 08:00 (le matin, pour que les membres voient l'alerte en se réveillant)
  cron.schedule("0 8 * * *", async () => {
    logger.info("⏳ [CRON 08:00] Détection des échéances approchantes...");
    try {
      const result = await alerteService.detecterEcheances();
      logger.info(`✅ [CRON] ${result.count} alerte(s) d'échéance envoyée(s).`);
    } catch (error) {
      logger.logError(error, { context: "CRON_ALERTES_ECHEANCES" });
    }
  });

  // ━━━━━ Tâche 4 : Détection des retards critiques (Alertes) ━━━━━
  // S'exécute tous les jours à 08:05 (juste après les échéances)
  cron.schedule("5 8 * * *", async () => {
    logger.info("⏳ [CRON 08:05] Génération des alertes de retard critique...");
    try {
      const result = await alerteService.detecterRetards();
      logger.info(`✅ [CRON] ${result.count} alerte(s) de retard envoyée(s).`);
    } catch (error) {
      logger.logError(error, { context: "CRON_ALERTES_RETARDS" });
    }
  });

  // ━━━━━ Tâche 5 (Bonus) : recalcul global de sécurité ━━━━━
  // S'exécute tous les dimanches à 03:00 du matin pour s'assurer qu'aucun
  // décalage de solde ne persiste à cause d'un bug ou d'une manipulation manuelle de BDD.
  cron.schedule("0 3 * * 0", async () => {
    logger.info("⏳ [CRON DIM 03:00] Recalcul global des soldes (Sécurité)...");
    try {
      const result = await soldeService.recalculerTout();
      logger.info(`✅ [CRON] Solde recalculé pour ${result.count} membre(s).`);
    } catch (error) {
      logger.logError(error, { context: "CRON_RECALCUL_GLOBAL" });
    }
  });

  logger.info("✅ Planificateur de tâches initialisé avec succès.");
};
