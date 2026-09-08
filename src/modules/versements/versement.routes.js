import { Router } from "express";
import { VersementController } from "./versement.controller.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import {
  protect,
  restrictTo,
} from "../../shared/middlewares/auth.middleware.js";
import {
  declarerVersementSchema,
  versementIdParamSchema,
  versementsQuerySchema,
  versementsAdminQuerySchema,
} from "./versement.schema.js";
import { crudLimiter } from "../../config/rateLimiter.js";

const router = Router();
const versementController = new VersementController();

// ─── Membre ─────────────────────────────────────────────────────

/**
 * @swagger
 * /api/versements:
 *   post:
 *     summary: Déclarer un versement (cotisation simple ou avance)
 *     description: Le montant doit être un multiple du montant de cotisation journalière. La période couverte est calculée automatiquement à partir du dernier jour déjà couvert.
 *     tags: [Versements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VersementCreateRequest'
 *     responses:
 *       201:
 *         description: Versement déclaré, en attente de validation
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Versement'
 *       400:
 *         description: Montant invalide (pas un multiple du montant journalier)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Seuil d'avance dépassé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  protect(),
  crudLimiter,
  validate(declarerVersementSchema),
  versementController.declarer,
);

/**
 * @swagger
 * /api/versements/me:
 *   get:
 *     summary: Mes versements
 *     tags: [Versements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/statutVersementQuery'
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *     responses:
 *       200:
 *         description: Liste des versements du membre connecté
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
 *                         $ref: '#/components/schemas/Versement'
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
  validate(versementsQuerySchema),
  versementController.mesVersements,
);

// ─── Admin / consultation commune ────────────────────────────────

/**
 * @swagger
 * /api/versements:
 *   get:
 *     summary: Lister tous les versements (Admin/Trésorier)
 *     tags: [Versements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/statutVersementQuery'
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *       - in: query
 *         name: membreId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des versements
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
 *                         $ref: '#/components/schemas/Versement'
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
  validate(versementsAdminQuerySchema),
  versementController.listAll,
);

/**
 * @swagger
 * /api/versements/{id}:
 *   get:
 *     summary: Détail d'un versement
 *     description: Accessible par l'admin, ou par le membre s'il s'agit de son propre versement.
 *     tags: [Versements]
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
 *         description: Détail du versement
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Versement'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Vous ne pouvez consulter que vos propres versements
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Versement introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:id",
  protect(),
  validate(versementIdParamSchema),
  versementController.getById,
);

// ─── Admin — validation / rejet ──────────────────────────────────

/**
 * @swagger
 * /api/versements/{id}/valider:
 *   patch:
 *     summary: Valider un versement (Admin/Trésorier)
 *     description: Rattache les cotisations existantes de la période à ce versement (statut PAYE) et valide le versement, de façon atomique.
 *     tags: [Versements]
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
 *         description: Versement validé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Versement'
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
 *         description: Versement introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Versement déjà traité
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  "/:id/valider",
  protect(),
  restrictTo("ADMIN"),
  crudLimiter,
  validate(versementIdParamSchema),
  versementController.valider,
);

/**
 * @swagger
 * /api/versements/{id}/rejeter:
 *   patch:
 *     summary: Rejeter un versement (Admin/Trésorier)
 *     tags: [Versements]
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
 *         description: Versement rejeté
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Versement'
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
 *         description: Versement introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Versement déjà traité
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  "/:id/rejeter",
  protect(),
  restrictTo("ADMIN"),
  crudLimiter,
  validate(versementIdParamSchema),
  versementController.rejeter,
);

export default router;