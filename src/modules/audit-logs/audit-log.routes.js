import { Router } from "express";
import { AuditLogController } from "./audit-log.controller.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { protect, restrictTo } from "../../shared/middlewares/auth.middleware.js";
import { auditLogQuerySchema } from "./audit-log.schema.js";

const router = Router();
const auditLogController = new AuditLogController();

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Consulter l'historique des actions (Traçabilité §5)
 *     description: Réservé à l'Administrateur. Permet de tracer chaque versement, validation, changement de statut, etc.
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: auteurId
 *         schema:
 *           type: string
 *         description: Filtrer par l'identifiant de celui qui a fait l'action
 *       - in: query
 *         name: entite
 *         schema:
 *           type: string
 *           enum: [Membre, Versement, Cotisation, Configuration, Solde]
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: "Ex: VERSEMENT_VALIDE"
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
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *     responses:
 *       200:
 *         description: Liste des logs paginée
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
 *                         $ref: '#/components/schemas/AuditLog'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Réservé à l'administrateur
 */
router.get(
  "/",
  protect(),
  restrictTo("ADMIN"),
  validate(auditLogQuerySchema),
  auditLogController.listAll
);

export default router;