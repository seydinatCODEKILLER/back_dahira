import { Router } from "express";
import { CotisationController } from "./cotisation.controller.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import {
  protect,
  restrictTo,
} from "../../shared/middlewares/auth.middleware.js";
import {
  cotisationsQuerySchema,
  cotisationsMembreSchema,
  membreIdParamSchema,
} from "./cotisation.schema.js";
import { crudLimiter } from "../../config/rateLimiter.js";

const router = Router();
const cotisationController = new CotisationController();

// ─── Vue "moi-même" ─────────────────────────────────────────────

/**
 * @swagger
 * /api/cotisations/me:
 *   get:
 *     summary: Mon calendrier de cotisations
 *     tags: [Cotisations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/statutCotisationQuery'
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *       - in: query
 *         name: dateDebut
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateFin
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Liste des cotisations du membre connecté
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
 *                         $ref: '#/components/schemas/Cotisation'
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
  validate(cotisationsQuerySchema),
  cotisationController.mesCotisations,
);

/**
 * @swagger
 * /api/cotisations/me/resume:
 *   get:
 *     summary: Mon résumé chiffré (jours payés / en attente / en retard)
 *     tags: [Cotisations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Résumé du membre connecté
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
 *                         paye:
 *                           type: integer
 *                         enAttente:
 *                           type: integer
 *                         retard:
 *                           type: integer
 *                         total:
 *                           type: integer
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me/resume", protect(), cotisationController.monResume);

// ─── Vue admin — un membre donné ─────────────────────────────────

/**
 * @swagger
 * /api/cotisations/membre/{membreId}:
 *   get:
 *     summary: Calendrier de cotisations d'un membre (Admin/Trésorier)
 *     tags: [Cotisations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: membreId
 *         required: true
 *         schema:
 *           type: string
 *       - $ref: '#/components/parameters/statutCotisationQuery'
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *     responses:
 *       200:
 *         description: Liste des cotisations du membre
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
 *                         $ref: '#/components/schemas/Cotisation'
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
  "/membre/:membreId",
  protect(),
  restrictTo("ADMIN"),
  validate(cotisationsMembreSchema),
  cotisationController.cotisationsDuMembre,
);

/**
 * @swagger
 * /api/cotisations/membre/{membreId}/resume:
 *   get:
 *     summary: Résumé chiffré d'un membre (Admin/Trésorier)
 *     tags: [Cotisations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: membreId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Résumé du membre
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
router.get(
  "/membre/:membreId/resume",
  protect(),
  restrictTo("ADMIN"),
  validate(membreIdParamSchema),
  cotisationController.resumeDuMembre,
);

// ─── Vue admin — toutes les cotisations ──────────────────────────

/**
 * @swagger
 * /api/cotisations:
 *   get:
 *     summary: Vue d'ensemble de toutes les cotisations (Admin/Trésorier)
 *     tags: [Cotisations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/statutCotisationQuery'
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *     responses:
 *       200:
 *         description: Liste de toutes les cotisations
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
 *                         $ref: '#/components/schemas/Cotisation'
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
  validate(cotisationsQuerySchema),
  cotisationController.listAll,
);

// ─── Déclencheurs manuels (en attendant le module `jobs`) ────────

/**
 * @swagger
 * /api/cotisations/generer-jour:
 *   post:
 *     summary: Générer les cotisations du jour (Admin — en attendant le scheduler)
 *     description: Crée une ligne EN_ATTENTE pour chaque membre actif, pour la date du jour. Idempotent — relancer plusieurs fois ne crée pas de doublons.
 *     tags: [Cotisations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Génération effectuée
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
  "/generer-jour",
  protect(),
  restrictTo("ADMIN"),
  crudLimiter,
  cotisationController.genererDuJour,
);

/**
 * @swagger
 * /api/cotisations/marquer-retards:
 *   post:
 *     summary: Détecter les retards critiques (Admin — en attendant le scheduler)
 *     description: Passe en RETARD toute cotisation EN_ATTENTE dont la date dépasse le délai de régularisation configuré.
 *     tags: [Cotisations]
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
  "/marquer-retards",
  protect(),
  restrictTo("ADMIN"),
  crudLimiter,
  cotisationController.marquerRetards,
);

export default router;