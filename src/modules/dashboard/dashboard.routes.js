import { Router } from "express";
import { DashboardController } from "./dashboard.controller.js";
import {
  protect,
  restrictTo,
} from "../../shared/middlewares/auth.middleware.js";

const router = Router();
const dashboardController = new DashboardController();

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Statistiques globales du tableau de bord (Admin/Trésorier)
 *     description: Fournit une vue d'ensemble de la caisse, des membres, du recouvrement du jour et des impayés.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques agrégées
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
 *                         membres:
 *                           type: object
 *                         caisse:
 *                           type: object
 *                         cotisationsJour:
 *                           type: object
 *                         impayes:
 *                           type: object
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Réservé à l'administrateur
 */
router.get(
  "/",
  protect(),
  restrictTo("ADMIN"),
  dashboardController.getGlobalStats,
);

export default router;
