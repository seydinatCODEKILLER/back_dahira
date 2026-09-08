import { prisma } from "../../config/database.js";
import { BaseRepository } from "../../shared/base/base.repository.js";

export class ConfigurationRepository extends BaseRepository {
  constructor() {
    super(prisma.configuration);
  }

  // Il n'y a qu'une seule ligne de configuration en base (posée par le seeder)
  async getSingleton() {
    return prisma.configuration.findFirst();
  }

  async updateSingleton(id, data) {
    return prisma.configuration.update({
      where: { id },
      data,
    });
  }
}
