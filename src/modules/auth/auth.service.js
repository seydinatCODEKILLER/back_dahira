import { AuthRepository } from "./auth.repository.js";
import { JwtService } from "../../config/jwt.js";
import { hashPassword, comparePassword } from "../../shared/utils/hasher.js";
import {
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/AppError.js";

const authRepo = new AuthRepository();
const jwtService = new JwtService();

// Hash fictif pour neutraliser le timing attack
const DUMMY_HASH =
  "$2b$10$abcdefghijklmnopqrstuuVVmqJZOdEJ.JkpjBnBnNmS6RsOi8jCy";

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

// Matricule séquentiel par année, ex: DHR-2026-0042
const generateMatricule = async () => {
  const year = new Date().getFullYear();
  const total = await authRepo.countMembres();
  const sequence = String(total + 1).padStart(4, "0");
  return `DHR-${year}-${sequence}`;
};

// ─── Service ──────────────────────────────────────────────────

export class AuthService {
  // ─── Inscription d'un membre ─────────────────────────────────
  // Réservée à l'Administrateur/Trésorier (cahier des charges §2, §3
  // "Gestion des Membres" — pas de self-service).
  async register(data) {
    const { nom, prenom, email, password, telephone, role } = data;

    const existingTelephone = await authRepo.findByTelephone(telephone);
    if (existingTelephone) {
      throw new ConflictError(
        "Un membre avec ce numéro de téléphone existe déjà",
      );
    }

    const hashedPassword = await hashPassword(password);
    const matricule = await generateMatricule();

    const membre = await authRepo.createMembre({
      matricule,
      nom,
      prenom,
      email: email || null,
      telephone,
      motDePasse: hashedPassword,
      role: role || "MEMBRE",
    });

    return { membre };
  }

  // ─── Connexion ────────────────────────────────────────────────
  // Le membre se connecte avec son numéro de téléphone.
  async login(telephone, password) {
    const membre = await authRepo.findByTelephone(telephone);

    // Timing attack neutralisé — toujours appeler comparePassword
    if (!membre) {
      await comparePassword(password, DUMMY_HASH);
      throw new UnauthorizedError("Téléphone ou mot de passe incorrect");
    }

    const isValid = await comparePassword(password, membre.motDePasse);
    if (!isValid) {
      throw new UnauthorizedError("Téléphone ou mot de passe incorrect");
    }

    if (membre.statut === "INACTIF") {
      throw new ForbiddenError("Votre compte a été désactivé.");
    }
    // BLOQUE : connexion autorisée — la restriction porte sur les nouvelles
    // avances (module versements), pas sur l'accès au compte.

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

  // ─── Profil courant ───────────────────────────────────────────
  async getCurrentUser(membreId) {
    const membre = await authRepo.findByIdSafe(membreId);
    if (!membre) throw new NotFoundError("Membre");
    return membre;
  }

  // ─── Mise à jour du profil ────────────────────────────────────
  // Le membre ne peut modifier que ses infos de contact —
  // matricule, rôle et statut restent réservés à l'admin.
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
      // Détection réutilisation — révoquer tous les tokens
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

    // Rotation : révoquer l'ancien, créer un nouveau
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

  // ─── Activer / désactiver / bloquer un compte (réservé à l'admin) ─
  // Le blocage automatique pour retard critique (règle des 2 jours)
  // sera déclenché par le futur module `soldes`/`alertes` en appelant
  // ce même repository — cette méthode reste la voie manuelle admin.
  async setStatut(membreId, statut) {
    const membre = await authRepo.findById(membreId);
    if (!membre) throw new NotFoundError("Membre");

    const updated = await authRepo.updateStatut(membreId, statut);

    // Si le compte n'est plus ACTIF, on invalide immédiatement ses sessions
    if (statut !== "ACTIF") {
      await authRepo.revokeAllMembreTokens(membreId);
    }

    return {
      message: `Statut du membre mis à jour : ${statut}`,
      membre: updated,
    };
  }
}