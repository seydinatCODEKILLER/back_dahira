import { MembreRepository } from "./membre.repository.js";

import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from "../../shared/errors/AppError.js";
import MediaUploader from "../../shared/utils/uploader.js";


const membreRepo = new MembreRepository();

export class MembreService {
  // ─── Liste & détail (réservé Admin/Trésorier) ──────────────────

  async list(filters) {
    return membreRepo.findManyFiltered(filters);
  }

  async getById(id) {
    const membre = await membreRepo.findByIdSafe(id);
    if (!membre) throw new NotFoundError("Membre");
    return membre;
  }

  // ─── Mise à jour des infos (réservé Admin) ──────────────────────
  // Pour ses propres nom/prénom/email, le membre passe par
  // PUT /api/auth/profile (module auth) — ceci est la voie admin,
  // qui autorise en plus le changement de téléphone.
  async updateInfo(id, data) {
    const membre = await membreRepo.findByIdSafe(id);
    if (!membre) throw new NotFoundError("Membre");

    if (data.telephone) {
      const conflict = await membreRepo.findByTelephoneExcludingId(
        data.telephone,
        id,
      );
      if (conflict) {
        throw new ConflictError("Ce numéro de téléphone est déjà utilisé");
      }
    }

    return membreRepo.updateInfo(id, {
      ...(data.nom && { nom: data.nom }),
      ...(data.prenom && { prenom: data.prenom }),
      ...(data.telephone && { telephone: data.telephone }),
      ...(data.email !== undefined && { email: data.email }),
    });
  }

  // ─── Avatar ──────────────────────────────────────────────────────
  // Accessible par le membre lui-même OU par l'admin.

  async uploadAvatar(membreId, requester, file) {
    if (!file) throw new BadRequestError("Aucun fichier fourni");
    this.assertCanManageAvatar(membreId, requester);

    const membre = await membreRepo.findByIdSafe(membreId);
    if (!membre) throw new NotFoundError("Membre");

    const uploader = new MediaUploader();

    // Supprime l'ancien avatar sur Cloudinary avant d'uploader le nouveau
    if (membre.avatar) {
      await uploader.deleteByUrl(membre.avatar);
    }

    const url = await uploader.upload(
      file,
      "dahira/membres",
      `avatar_${membreId}`,
    );

    return membreRepo.updateAvatar(membreId, url);
  }

  async removeAvatar(membreId, requester) {
    this.assertCanManageAvatar(membreId, requester);

    const membre = await membreRepo.findByIdSafe(membreId);
    if (!membre) throw new NotFoundError("Membre");

    if (membre.avatar) {
      const uploader = new MediaUploader();
      await uploader.deleteByUrl(membre.avatar);
    }

    return membreRepo.updateAvatar(membreId, null);
  }

  assertCanManageAvatar(membreId, requester) {
    const isSelf = requester.id === membreId;
    const isAdmin = requester.role === "ADMIN";
    if (!isSelf && !isAdmin) {
      throw new ForbiddenError(
        "Vous ne pouvez modifier que votre propre avatar",
      );
    }
  }
}