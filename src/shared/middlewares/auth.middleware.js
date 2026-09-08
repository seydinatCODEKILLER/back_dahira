import { prisma } from "../../config/database.js";
import { JwtService } from "../../config/jwt.js";
import {
  UnauthorizedError,
  ForbiddenError,
  AppError,
} from "../../shared/errors/AppError.js";

const jwtService = new JwtService();

// ─── Protect — vérifie le JWT et attache req.user ────────────
export const protect = () => async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Token manquant ou format invalide");
    }

    const token = header.split(" ")[1];
    const decoded = jwtService.verify(token);

    const currentMembre = await prisma.membre.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        role: true,
        statut: true,
      },
    });

    if (!currentMembre) {
      throw new UnauthorizedError(
        "Le token appartient à un membre qui n'existe plus.",
      );
    }

    // INACTIF = compte désactivé par l'admin → accès totalement coupé.
    // BLOQUE = retard critique → connexion maintenue (le membre doit pouvoir
    // consulter son solde et le régulariser), seules les nouvelles avances
    // sont restreintes — cette restriction est appliquée dans le module `versements`.
    if (currentMembre.statut === "INACTIF") {
      throw new ForbiddenError("Votre compte a été désactivé.");
    }

    req.user = currentMembre;
    next();
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : new UnauthorizedError("Token invalide ou session expirée"),
    );
  }
};

// ─── RestrictTo — restriction par rôle ───────────────────────
// Utilisation : restrictTo("ADMIN")
export const restrictTo =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          "Vous n'avez pas la permission d'effectuer cette action.",
        ),
      );
    }
    next();
  };
