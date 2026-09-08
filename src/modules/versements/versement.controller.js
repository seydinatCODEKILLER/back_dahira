import { VersementService } from "./versement.service.js";

const versementService = new VersementService();

export class VersementController {
  // ─── Membre ───────────────────────────────────────────────────

  async declarer(req, res, next) {
    try {
      const { montant } = req.validated.body;
      const versement = await versementService.declarer(req.user.id, montant);
      res.status(201).json({
        success: true,
        message: "Versement déclaré, en attente de validation par le trésorier",
        data: versement,
      });
    } catch (error) {
      next(error);
    }
  }

  async mesVersements(req, res, next) {
    try {
      const { statut, page, limit } = req.validated.query;
      const result = await versementService.listForMembre(req.user.id, {
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

  // ─── Admin / consultation commune ────────────────────────────────

  async listAll(req, res, next) {
    try {
      const { statut, membreId, page, limit } = req.validated.query;
      const result = await versementService.listAll({
        statut,
        membreId,
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
      const versement = await versementService.getById(
        req.validated.params.id,
        req.user,
      );
      res.status(200).json({ success: true, data: versement });
    } catch (error) {
      next(error);
    }
  }

  // ─── Admin — validation / rejet ──────────────────────────────────

  async valider(req, res, next) {
    try {
      const versement = await versementService.valider(
        req.validated.params.id,
        req.user.id,
      );
      res.status(200).json({
        success: true,
        message: "Versement validé avec succès",
        data: versement,
      });
    } catch (error) {
      next(error);
    }
  }

  async rejeter(req, res, next) {
    try {
      const versement = await versementService.rejeter(
        req.validated.params.id,
        req.user.id,
      );
      res.status(200).json({
        success: true,
        message: "Versement rejeté",
        data: versement,
      });
    } catch (error) {
      next(error);
    }
  }
}