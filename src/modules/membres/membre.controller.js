import { MembreService } from "./membre.service.js";

const membreService = new MembreService();

export class MembreController {
  async list(req, res, next) {
    try {
      const { statut, recherche, page, limit } = req.validated.query;
      const result = await membreService.list({
        statut,
        recherche,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const membre = await membreService.getById(req.validated.params.id);
      res.status(200).json({ success: true, data: membre });
    } catch (error) {
      next(error);
    }
  }

  async updateInfo(req, res, next) {
    try {
      const membre = await membreService.updateInfo(
        req.validated.params.id,
        req.validated.body,
      );
      res.status(200).json({
        success: true,
        message: "Membre mis à jour avec succès",
        data: membre,
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadAvatar(req, res, next) {
    try {
      const membre = await membreService.uploadAvatar(
        req.validated.params.id,
        req.user,
        req.file,
      );
      res.status(200).json({
        success: true,
        message: "Avatar mis à jour avec succès",
        data: membre,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeAvatar(req, res, next) {
    try {
      const membre = await membreService.removeAvatar(
        req.validated.params.id,
        req.user,
      );
      res.status(200).json({
        success: true,
        message: "Avatar supprimé avec succès",
        data: membre,
      });
    } catch (error) {
      next(error);
    }
  }
}