import { DashboardService } from "./dashboard.service.js";

const dashboardService = new DashboardService();

export class DashboardController {
  async getGlobalStats(req, res, next) {
    try {
      const stats = await dashboardService.getGlobalStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}