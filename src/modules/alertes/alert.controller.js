import { AlerteService } from "./alert.service.js";

const alerteService = new AlerteService();

export class AlerteController {
  // ─── Membre ───────────────────────────────────────────────────

  async mesAlertes(req, res, next) {
    try {
      const { type, estLue, page, limit } = req.validated.query;
      const result = await alerteService.mesAlertes(req.user.id, {
        type,
        estLue: estLue !== undefined ? estLue === "true" : undefined,
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

  async monResume(req, res, next) {
    try {
      const resume = await alerteService.monResume(req.user.id);
      res.status(200).json({ success: true, data: resume });
    } catch (error) {
      next(error);
    }
  }

  async marquerLue(req, res, next) {
    try {
      const alerte = await alerteService.marquerLue(
        req.validated.params.id,
        req.user,
      );
      res.status(200).json({
        success: true,
        message: "Alerte marquée comme lue",
        data: alerte,
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Admin / Trésorier ────────────────────────────────────────

  async alertesTresorier(req, res, next) {
    try {
      const { type, estLue, page, limit } = req.validated.query;
      const result = await alerteService.alertesTresorier({
        type,
        estLue: estLue !== undefined ? estLue === "true" : undefined,
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

  async listAll(req, res, next) {
    try {
      const { membreId, type, destinataire, page, limit } = req.validated.query;
      const result = await alerteService.listAll({
        membreId,
        type,
        destinataire,
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

  // ─── Déclencheurs manuels (en attendant le module `jobs`) ────────

  async detecterEcheances(req, res, next) {
    try {
      const result = await alerteService.detecterEcheances();
      res.status(200).json({
        success: true,
        message: `${result.count} alerte(s) d'échéance envoyée(s)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async detecterRetards(req, res, next) {
    try {
      const result = await alerteService.detecterRetards();
      res.status(200).json({
        success: true,
        message: `${result.count} alerte(s) de retard envoyée(s)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}