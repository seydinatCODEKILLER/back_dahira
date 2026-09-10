import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import {
  protect,
  restrictTo,
} from "../../shared/middlewares/auth.middleware.js";
import { sanitizeBody } from "../../shared/middlewares/sanitize.middleware.js";
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  updateProfileSchema,
  setStatutSchema,
  changePinSchema,
} from "./auth.schema.js";
import { authLimiter, refreshTokenLimiter } from "../../config/rateLimiter.js";

const router = Router();
const authController = new AuthController();

// ─── Inscription (réservée à l'Administrateur/Trésorier) ─────

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Inscrire un nouveau membre
 *     description: Réservé à l'Administrateur/Trésorier.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, prenom, telephone, codePin]
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               telephone:
 *                 type: string
 *               email:
 *                 type: string
 *               codePin:
 *                 type: string
 *                 description: Code PIN à 4 chiffres
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MEMBRE]
 *     responses:
 *       201:
 *         description: Membre inscrit avec succès
 */
router.post(
  "/register",
  protect(),
  restrictTo("ADMIN"),
  validate(registerSchema),
  authController.register,
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion avec téléphone et code PIN
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [telephone, codePin]
 *             properties:
 *               telephone:
 *                 type: string
 *               codePin:
 *                 type: string
 *                 description: Code PIN à 4 chiffres
 *     responses:
 *       200:
 *         description: Connexion réussie
 */
router.post("/login", authLimiter, validate(loginSchema), authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rafraîchir l'access token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token rafraîchi avec succès
 */
router.post(
  "/refresh",
  refreshTokenLimiter,
  validate(refreshTokenSchema),
  authController.refreshToken,
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Déconnexion
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */
router.post("/logout", validate(refreshTokenSchema), authController.logout);

// ─── Routes protégées ─────────────────────────────────────────

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Profil du membre connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations du membre récupérées avec succès
 */
router.get("/me", protect(), authController.getCurrentUser);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Mettre à jour son profil (nom, prénom, email, avatar)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil mis à jour avec succès
 */
router.put(
  "/profile",
  protect(),
  sanitizeBody,
  validate(updateProfileSchema),
  authController.updateProfile,
);

/**
 * @swagger
 * /api/auth/change-pin:
 *   patch:
 *     summary: Changer le code PIN
 *     description: Permet à l'utilisateur connecté de mettre à jour son code PIN. Révoque toutes les sessions existantes après modification.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ancienCodePin, nouveauCodePin]
 *             properties:
 *               ancienCodePin:
 *                 type: string
 *                 example: "1234"
 *               nouveauCodePin:
 *                 type: string
 *                 example: "5678"
 *     responses:
 *       200:
 *         description: Code PIN modifié avec succès
 *       401:
 *         description: Ancien code PIN incorrect ou non authentifié
 */
router.patch(
  "/change-pin",
  protect(),
  validate(changePinSchema),
  authController.changePin
);

/**
 * @swagger
 * /api/auth/revoke-all-tokens:
 *   post:
 *     summary: Révoquer tous les tokens (déconnecter tous les appareils)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tous les refresh tokens ont été révoqués
 */
router.post("/revoke-all-tokens", protect(), authController.revokeAllTokens);

/**
 * @swagger
 * /api/auth/set-statut:
 *   patch:
 *     summary: Activer, désactiver ou bloquer un membre (Admin seulement)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [membreId, statut]
 *             properties:
 *               membreId:
 *                 type: string
 *               statut:
 *                 type: string
 *                 enum: [ACTIF, INACTIF, BLOQUE]
 *     responses:
 *       200:
 *         description: Statut du membre mis à jour avec succès
 */
router.patch(
  "/set-statut",
  protect(),
  restrictTo("ADMIN"),
  validate(setStatutSchema),
  authController.setStatut,
);

export default router;
