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
 *     description: Réservé à l'Administrateur/Trésorier — l'inscription n'est pas en self-service (cahier des charges §2, §3).
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MembreCreateRequest'
 *     responses:
 *       201:
 *         description: Membre inscrit avec succès
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
 *                         membre:
 *                           $ref: '#/components/schemas/Membre'
 *       400:
 *         description: Données invalides ou mot de passe faible
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
 *       409:
 *         description: Numéro de téléphone déjà utilisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *     summary: Connexion avec téléphone et mot de passe
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Identifiants incorrects
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Compte désactivé ou bloqué
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  authController.login,
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rafraîchir l'access token
 *     description: Retourne un nouvel access token et un nouveau refresh token (rotation). L'ancien refresh token est révoqué.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: Token rafraîchi avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RefreshResponse'
 *       400:
 *         description: Refresh token manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Refresh token invalide, révoqué ou expiré
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *     description: Révoque le refresh token fourni pour empêcher sa réutilisation.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Refresh token manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Membre'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Membre non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *                 minLength: 2
 *               prenom:
 *                 type: string
 *                 minLength: 2
 *               email:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Membre'
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
 * /api/auth/revoke-all-tokens:
 *   post:
 *     summary: Révoquer tous les tokens (déconnecter tous les appareils)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tous les refresh tokens ont été révoqués
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
 */
router.post("/revoke-all-tokens", protect(), authController.revokeAllTokens);

/**
 * @swagger
 * /api/auth/set-statut:
 *   patch:
 *     summary: Activer, désactiver ou bloquer un membre (Admin seulement)
 *     description: Tout statut différent de ACTIF révoque immédiatement toutes les sessions actives du membre.
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
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
 *         description: Permissions insuffisantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  "/set-statut",
  protect(),
  restrictTo("ADMIN"),
  validate(setStatutSchema),
  authController.setStatut,
);

export default router;