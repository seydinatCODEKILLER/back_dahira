import { Router } from "express";
import { AlerteController } from "./alert.controller.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import {
  protect,
  restrictTo,
} from "../../shared/middlewares/auth.middleware.js";
import {
  alerteIdParamSchema,
  mesAlertesQuerySchema,
  alertesAdminQuerySchema,
} from "./alert.schema.js";
import { crudLimiter } from "../../config/rateLimiter.js";

const router = Router();
const alerteController = new AlerteController();

// ─── Membre ─────────────────────────────────────────────────────

/**
 * @swagger
 * /api/alertes/me:
 *   get:
 *     summary: Mes alertes (échéances et retards)
 *     tags: [Alertes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ECHEANCE, RETARD]
 *       - in: query
 *         name: estLue
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *     responses:
 *       200:
 *         description: Liste des alertes du membre connecté
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Alerte'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/me",
  protect(),
  validate(mesAlertesQuerySchema),
  alerteController.mesAlertes,
);

/**
 * @swagger
 * /api/alertes/me/resume:
 *   get:
 *     summary: Nombre d'alertes non lues
 *     tags: [Alertes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Résumé
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         nonLues:
 *                           type: integer
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me/resume", protect(), alerteController.monResume);

/**
 * @swagger
 * /api/alertes/{id}/lue:
 *   patch:
 *     summary: Marquer une alerte comme lue
 *     description: Accessible par le membre concerné ou par l'admin.
 *     tags: [Alertes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alerte marquée comme lue
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Alerte'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Vous ne pouvez marquer comme lues que vos propres alertes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Alerte introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  "/:id/lue",
  protect(),
  validate(alerteIdParamSchema),
  alerteController.marquerLue,
);

// ─── Admin / Trésorier ──────────────────────────────────────────

/**
 * @swagger
 * /api/alertes/tresorier:
 *   get:
 *     summary: Alertes destinées au trésorier (Admin)
 *     tags: [Alertes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ECHEANCE, RETARD]
 *       - in: query
 *         name: estLue
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *     responses:
 *       200:
 *         description: Liste des alertes destinées au trésorier
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Alerte'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Réservé à l'administrateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/tresorier",
  protect(),
  restrictTo("ADMIN"),
  validate(mesAlertesQuerySchema),
  alerteController.alertesTresorier,
);

/**
 * @swagger
 * /api/alertes:
 *   get:
 *     summary: Historique complet des alertes (Admin — traçabilité §5)
 *     tags: [Alertes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: membreId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ECHEANCE, RETARD]
 *       - in: query
 *         name: destinataire
 *         schema:
 *           type: string
 *           enum: [MEMBRE, TRESORIER, LES_DEUX]
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *     responses:
 *       200:
 *         description: Historique des alertes
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Alerte'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Réservé à l'administrateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/",
  protect(),
  restrictTo("ADMIN"),
  validate(alertesAdminQuerySchema),
  alerteController.listAll,
);

// ─── Déclencheurs manuels (en attendant le module `jobs`) ────────

/**
 * @swagger
 * /api/alertes/detecter-echeances:
 *   post:
 *     summary: Détecter les échéances qui approchent (Admin — en attendant le scheduler)
 *     description: Envoie une alerte ECHEANCE aux membres dont une cotisation EN_ATTENTE atteindra le délai de régularisation le lendemain. Idempotent — une seule alerte par membre et par jour.
 *     tags: [Alertes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Détection effectuée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Réservé à l'administrateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Configuration non initialisée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/detecter-echeances",
  protect(),
  restrictTo("ADMIN"),
  crudLimiter,
  alerteController.detecterEcheances,
);

/**
 * @swagger
 * /api/alertes/detecter-retards:
 *   post:
 *     summary: Détecter les retards critiques (Admin — en attendant le scheduler)
 *     description: Envoie une alerte RETARD (membre + trésorier) pour chaque membre actuellement BLOQUE. Idempotent — une seule alerte par membre et par jour. À lancer après /api/cotisations/marquer-retards.
 *     tags: [Alertes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Détection effectuée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Réservé à l'administrateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/detecter-retards",
  protect(),
  restrictTo("ADMIN"),
  crudLimiter,
  alerteController.detecterRetards,
);

export default router;