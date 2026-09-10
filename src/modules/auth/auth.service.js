import { AuthRepository } from "./auth.repository.js";
import { JwtService } from "../../config/jwt.js";
import {
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/AppError.js";

const authRepo = new AuthRepository();
const jwtService = new JwtService();

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Helpers privés ───────────────────────────────────────────

const buildMembrePayload = (membre) => ({
  id: membre.id,
  telephone: membre.telephone,
  role: membre.role,
});

const createTokens = async (membre) => {
  const payload = buildMembrePayload(membre);
  const accessToken = jwtService.sign(payload);
  const refreshToken = jwtService.signRefresh(payload);

  await authRepo.createRefreshToken({
    token: refreshToken,
    membreId: membre.id,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return { accessToken, refreshToken };
};

const generateMatricule = async () => {
  const year = new Date().getFullYear();
  const total = await authRepo.countMembres();
  const sequence = String(total + 1).padStart(4, "0");
  return `DHR-${year}-${sequence}`;
};

// ─── Service ──────────────────────────────────────────────────

export class AuthService {
  // ─── Inscription d'un membre ─────────────────────────────────
  async register(data) {
    const { nom, prenom, email, codePin, telephone, role } = data;

    const existingTelephone = await authRepo.findByTelephone(telephone);
    if (existingTelephone) {
      throw new ConflictError(
        "Un membre avec ce numéro de téléphone existe déjà",
      );
    }

    const matricule = await generateMatricule();

    const membre = await authRepo.createMembre({
      matricule,
      nom,
      prenom,
      email: email || null,
      telephone,
      codePin,
      role: role || "MEMBRE",
    });

    return { membre };
  }

  // ─── Connexion ────────────────────────────────────────────────
  async login(telephone, codePin) {
    const membre = await authRepo.findByTelephone(telephone);

    if (!membre) {
      throw new UnauthorizedError("Téléphone ou code PIN incorrect");
    }

    if (membre.codePin !== codePin) {
      throw new UnauthorizedError("Téléphone ou code PIN incorrect");
    }

    if (membre.statut === "INACTIF") {
      throw new ForbiddenError("Votre compte a été désactivé.");
    }

    const [{ accessToken, refreshToken }] = await Promise.all([
      createTokens(membre),
      authRepo.updateLastLogin(membre.id),
    ]);

    const safeMembre = await authRepo.findByIdSafe(membre.id);

    return {
      membre: safeMembre,
      accessToken,
      refreshToken,
    };
  }

  // ─── NOUVEAU : Changer le code PIN ───────────────────────────
  async changePin(membreId, ancienCodePin, nouveauCodePin) {
    // On récupère le membre avec son codePin actuel (findById n'est pas "safe")
    const membre = await authRepo.findById(membreId);
    if (!membre) throw new NotFoundError("Membre");

    // Vérification de l'ancien code
    if (membre.codePin !== ancienCodePin) {
      throw new UnauthorizedError("L'ancien code PIN est incorrect.");
    }

    // Mise à jour avec le nouveau code
    await authRepo.updateCodePin(membreId, nouveauCodePin);

    // Optionnel mais recommandé : révoquer tous les refresh tokens existants
    // pour forcer l'utilisateur à se reconnecter sur tous ses appareils avec le nouveau PIN
    await authRepo.revokeAllMembreTokens(membreId);

    return { message: "Code PIN modifié avec succès. Veuillez vous reconnecter." };
  }

  // ─── Profil courant ───────────────────────────────────────────
  async getCurrentUser(membreId) {
    const membre = await authRepo.findByIdSafe(membreId);
    if (!membre) throw new NotFoundError("Membre");
    return membre;
  }

  // ─── Mise à jour du profil ────────────────────────────────────
  async updateProfile(membreId, data) {
    const membre = await authRepo.findById(membreId);
    if (!membre) throw new NotFoundError("Membre");

    return authRepo.updateProfile(membreId, {
      ...(data.nom && { nom: data.nom }),
      ...(data.prenom && { prenom: data.prenom }),
      ...(data.email !== undefined && { email: data.email }),
    });
  }

  // ─── Refresh token ────────────────────────────────────────────
  async refreshToken(token) {
    const stored = await authRepo.findRefreshToken(token);

    if (!stored) {
      throw new UnauthorizedError("Refresh token invalide");
    }

    if (stored.isRevoked) {
      await authRepo.revokeAllMembreTokens(stored.membreId);
      throw new UnauthorizedError(
        "Refresh token révoqué — tous vos appareils ont été déconnectés",
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token expiré");
    }

    const membre = stored.membre;
    if (membre.statut === "INACTIF") {
      throw new ForbiddenError("Compte désactivé");
    }

    const payload = buildMembrePayload(membre);
    const newAccessToken = jwtService.sign(payload);
    const newRefreshToken = jwtService.signRefresh(payload);

    await Promise.all([
      authRepo.revokeRefreshToken(token),
      authRepo.createRefreshToken({
        token: newRefreshToken,
        membreId: membre.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      }),
    ]);

    const safeMembre = await authRepo.findByIdSafe(membre.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      membre: safeMembre,
    };
  }

  // ─── Déconnexion ──────────────────────────────────────────────
  async logout(token) {
    if (token) {
      await authRepo.revokeRefreshToken(token).catch(() => {});
    }
    return { message: "Déconnexion réussie" };
  }

  // ─── Révoquer tous les tokens ─────────────────────────────────
  async revokeAllTokens(membreId) {
    await authRepo.revokeAllMembreTokens(membreId);
    return { message: "Tous les refresh tokens ont été révoqués" };
  }

  // ─── Activer / désactiver / bloquer un compte ─────────────────
  async setStatut(membreId, statut) {
    const membre = await authRepo.findById(membreId);
    if (!membre) throw new NotFoundError("Membre");

    const updated = await authRepo.updateStatut(membreId, statut);

    if (statut !== "ACTIF") {
      await authRepo.revokeAllMembreTokens(membreId);
    }

    return {
      message: `Statut du membre mis à jour : ${statut}`,
      membre: updated,
    };
  }
}