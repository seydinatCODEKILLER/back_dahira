import { AuditLogRepository } from "./audit-log.repository.js";

const auditLogRepo = new AuditLogRepository();

export class AuditLogService {
  async listAll(filters) {
    return auditLogRepo.findManyFiltered(filters);
  }
}
