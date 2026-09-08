import { AuditLogService } from "./audit-log.service.js";

const auditLogService = new AuditLogService();

export class AuditLogController {
  async listAll(req, res, next) {
    try {
      const { auteurId, entite, action, dateDebut, dateFin, page, limit } =
        req.validated.query;

      const result = await auditLogService.listAll({
        auteurId,
        entite,
        action,
        dateDebut: dateDebut ? new Date(dateDebut) : undefined,
        dateFin: dateFin ? new Date(dateFin) : undefined,
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
}
