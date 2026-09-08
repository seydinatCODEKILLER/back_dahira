import { CotisationService } from "./cotisation.service.js";

const cotisationService = new CotisationService();

export class CotisationController {
  // ─── Vue "moi-même" ─────────────────────────────────────────────

  async mesCotisations(req, res, next) {
    try {
      const { dateDebut, dateFin, statut, page, limit } = req.validated.query;
      const result = await cotisationService.listForMembre(req.user.id, {
        dateDebut,
        dateFin,
        statut,
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
      const resume = await cotisationService.getResume(req.user.id);
      res.status(200).json({ success: true, data: resume });
    } catch (error) {
      next(error);
    }
  }

  // ─── Vue admin — un membre donné ─────────────────────────────────

  async cotisationsDuMembre(req, res, next) {
    try {
      const { dateDebut, dateFin, statut, page, limit } = req.validated.query;
      const result = await cotisationService.listForMembre(
        req.validated.params.membreId,
        {
          dateDebut,
          dateFin,
          statut,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        },
      );
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async resumeDuMembre(req, res, next) {
    try {
      const resume = await cotisationService.getResume(
        req.validated.params.membreId,
      );
      res.status(200).json({ success: true, data: resume });
    } catch (error) {
      next(error);
    }
  }

  // ─── Vue admin — toutes les cotisations ──────────────────────────

  async listAll(req, res, next) {
    try {
      const { dateDebut, dateFin, statut, page, limit } = req.validated.query;
      const result = await cotisationService.listAll({
        dateDebut,
        dateFin,
        statut,
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

  // ─── Actions admin — déclencheurs manuels (en attendant le scheduler) ─

  async genererDuJour(req, res, next) {
    try {
      const result = await cotisationService.genererDuJour();
      res.status(200).json({ success: true, message: result.message, data: { count: result.count } });
    } catch (error) {
      next(error);
    }
  }

  async marquerRetards(req, res, next) {
    try {
      const result = await cotisationService.marquerRetards();
      res.status(200).json({ success: true, message: result.message, data: { count: result.count } });
    } catch (error) {
      next(error);
    }
  }
}