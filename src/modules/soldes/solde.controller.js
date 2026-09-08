import { SoldeService } from "./solde.service.js";

const soldeService = new SoldeService();

export class SoldeController {
  async monSolde(req, res, next) {
    try {
      const solde = await soldeService.getForMembre(req.user.id);
      res.status(200).json({ success: true, data: solde });
    } catch (error) {
      next(error);
    }
  }

  async soldeDuMembre(req, res, next) {
    try {
      const solde = await soldeService.getForMembre(
        req.validated.params.membreId,
      );
      res.status(200).json({ success: true, data: solde });
    } catch (error) {
      next(error);
    }
  }

  async listAll(req, res, next) {
    try {
      const { statut, page, limit } = req.validated.query;
      const result = await soldeService.listAll({
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

  // ─── Déclencheurs manuels (en attendant le module `jobs`) ────────

  async recalculerMembre(req, res, next) {
    try {
      const solde = await soldeService.recalculerPourMembre(
        req.validated.params.membreId,
      );
      res.status(200).json({
        success: true,
        message: "Solde recalculé avec succès",
        data: solde,
      });
    } catch (error) {
      next(error);
    }
  }

  async recalculerTout(req, res, next) {
    try {
      const result = await soldeService.recalculerTout();
      res.status(200).json({
        success: true,
        message: `Solde recalculé pour ${result.count} membre(s)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
