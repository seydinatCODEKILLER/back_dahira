import { ConfigurationRepository } from "./configuration.repository.js";
import { NotFoundError } from "../../shared/errors/AppError.js";

const configRepo = new ConfigurationRepository();

export class ConfigurationService {
  async get() {
    const config = await configRepo.getSingleton();
    if (!config) {
      // Ne devrait jamais arriver si le seeder a été lancé (npx prisma db seed)
      throw new NotFoundError(
        "Configuration (lancez le seeder : npx prisma db seed)",
      );
    }
    return config;
  }

  // Réservé à l'admin
  async update(data) {
    const config = await this.get();

    return configRepo.updateSingleton(config.id, {
      ...(data.montantCotisationJournaliere !== undefined && {
        montantCotisationJournaliere: data.montantCotisationJournaliere,
      }),
      ...(data.seuilAvanceJoursMax !== undefined && {
        seuilAvanceJoursMax: data.seuilAvanceJoursMax,
      }),
      ...(data.delaiRegularisationJours !== undefined && {
        delaiRegularisationJours: data.delaiRegularisationJours,
      }),
    });
  }
}
