import { Router } from "express";
import { SoldeController } from "./solde.controller.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import {
  protect,
  restrictTo,
} from "../../shared/middlewares/auth.middleware.js";
import { soldeMembreParamSchema, soldesQuerySchema } from "./solde.schema.js";
import { crudLimiter } from "../../config/rateLimiter.js";

const router = Router();
const soldeController = new SoldeController();

/**
 * @swagger
 * /api/soldes/me:
 *   get:
 *     summary: Mon solde (à jour / en avance / en retard / bloqué)
 *     tags: [Soldes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Solde du membre connecté
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Solde'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me", protect(), soldeController.monSolde);

/**
 * @swagger
 * /api/soldes:
 *   get:
 *     summary: Vue d'ensemble des soldes (Admin/Trésorier)
 *     tags: [Soldes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [A_JOUR, EN_AVANCE, EN_RETARD, BLOQUE]
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *     responses:
 *       200:
 *         description: Liste des soldes
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
 *                         $ref: '#/components/schemas/Solde'
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
  validate(soldesQuerySchema),
  soldeController.listAll,
);

/**
 * @swagger
 * /api/soldes/membre/{membreId}:
 *   get:
 *     summary: Solde d'un membre (Admin/Trésorier)
 *     tags: [Soldes]
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
 *         description: Solde du membre
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Solde'
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
  validate(soldeMembreParamSchema),
  soldeController.soldeDuMembre,
);

// ─── Déclencheurs manuels (en attendant le module `jobs`) ────────

/**
 * @swagger
 * /api/soldes/membre/{membreId}/recalculer:
 *   post:
 *     summary: Recalculer le solde d'un membre (Admin — en attendant le scheduler)
 *     tags: [Soldes]
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
 *         description: Solde recalculé
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Solde'
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
  "/membre/:membreId/recalculer",
  protect(),
  restrictTo("ADMIN"),
  crudLimiter,
  validate(soldeMembreParamSchema),
  soldeController.recalculerMembre,
);

/**
 * @swagger
 * /api/soldes/recalculer-tout:
 *   post:
 *     summary: Recalculer le solde de tous les membres actifs/bloqués (Admin — en attendant le scheduler)
 *     tags: [Soldes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recalcul effectué
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
  "/recalculer-tout",
  protect(),
  restrictTo("ADMIN"),
  crudLimiter,
  soldeController.recalculerTout,
);

export default router;
