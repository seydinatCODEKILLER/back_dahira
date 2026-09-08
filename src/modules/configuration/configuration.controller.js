import { ConfigurationService } from "./configuration.service.js";

const configService = new ConfigurationService();

export class ConfigurationController {
  async get(req, res, next) {
    try {
      const config = await configService.get();
      res.status(200).json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const config = await configService.update(req.validated.body);
      res.status(200).json({
        success: true,
        message: "Configuration mise à jour avec succès",
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }
}
