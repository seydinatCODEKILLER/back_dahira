import { Router } from "express";
import { ConfigurationController } from "./configuration.controller.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import {
  protect,
  restrictTo,
} from "../../shared/middlewares/auth.middleware.js";
import { updateConfigurationSchema } from "./configuration.schema.js";

const router = Router();
const configController = new ConfigurationController();

/**
 * @swagger
 * /api/configuration:
 *   get:
 *     summary: Lire les paramètres de cotisation en vigueur
 *     description: Accessible à tout membre connecté (montant journalier, seuil d'avance, délai de régularisation).
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration actuelle
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Configuration'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Configuration non initialisée (lancez le seeder)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", protect(), configController.get);

/**
 * @swagger
 * /api/configuration:
 *   put:
 *     summary: Modifier les paramètres de cotisation (Admin seulement)
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               montantCotisationJournaliere:
 *                 type: integer
 *                 example: 100
 *               seuilAvanceJoursMax:
 *                 type: integer
 *                 example: 30
 *               delaiRegularisationJours:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Configuration mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Configuration'
 *       400:
 *         description: Données invalides
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
 *         description: Réservé à l'administrateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Configuration non initialisée (lancez le seeder)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/",
  protect(),
  restrictTo("ADMIN"),
  validate(updateConfigurationSchema),
  configController.update,
);

export default router;
