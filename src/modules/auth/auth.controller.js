import { AuthService } from "./auth.service.js";

const authService = new AuthService();

export class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.validated.body);
      res.status(201).json({
        success: true,
        message: "Membre inscrit avec succès",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { telephone, codePin } = req.validated.body;
      const result = await authService.login(telephone, codePin);
      res.status(200).json({
        success: true,
        message: "Connexion réussie",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── NOUVEAU : Changer le code PIN ───────────────────────────
  async changePin(req, res, next) {
    try {
      const { ancienCodePin, nouveauCodePin } = req.validated.body;
      const result = await authService.changePin(
        req.user.id,
        ancienCodePin,
        nouveauCodePin
      );
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      const result = await authService.getCurrentUser(req.user.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const result = await authService.updateProfile(
        req.user.id,
        req.validated.body,
      );
      res.status(200).json({
        success: true,
        message: "Profil mis à jour avec succès",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.validated.body;
      const result = await authService.refreshToken(refreshToken);
      res.status(200).json({
        success: true,
        message: "Token rafraîchi avec succès",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.validated.body;
      await authService.logout(refreshToken);
      res.status(200).json({
        success: true,
        message: "Déconnexion réussie",
      });
    } catch (error) {
      next(error);
    }
  }

  async revokeAllTokens(req, res, next) {
    try {
      const result = await authService.revokeAllTokens(req.user.id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async setStatut(req, res, next) {
    try {
      const { membreId, statut } = req.validated.body;
      const result = await authService.setStatut(membreId, statut);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.membre,
      });
    } catch (error) {
      next(error);
    }
  }
}