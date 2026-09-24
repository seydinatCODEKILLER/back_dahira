import { prisma } from "../../config/database.js";
import { JwtService } from "../../config/jwt.js";
import {
  UnauthorizedError,
  ForbiddenError,
  PinChangeRequiredError,
  AppError,
} from "../../shared/errors/AppError.js";

const jwtService = new JwtService();

// ─── Protect — vérifie le JWT et attache req.user ────────────
export const protect =
  (options = {}) =>
  async (req, _res, next) => {
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
          doitChangerPin: true,
        },
      });

      if (!currentMembre) {
        throw new UnauthorizedError(
          "Le token appartient à un membre qui n'existe plus.",
        );
      }

      if (currentMembre.statut === "INACTIF") {
        throw new ForbiddenError("Votre compte a été désactivé.");
      }

      // L'obligation de changer le PIN ne s'applique qu'aux MEMBRE.
      const doitChangerPin =
        currentMembre.role !== "ADMIN" && currentMembre.doitChangerPin;

      if (doitChangerPin && !options.allowPinChangeRequired) {
        throw new PinChangeRequiredError();
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