import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const getClientIp = (req, res) => {
  return ipKeyGenerator(req, res);
};

/**
 * Rate limiter général — 200 req / 15 min par IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: getClientIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Trop de requêtes, veuillez réessayer plus tard",
  },
  skip: (req) => ["/auth/refresh"].some((path) => req.path.endsWith(path)),
});

/**
 * Login — 10 tentatives / 15 min par IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: getClientIp,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
  },
});

/**
 * Inscription — 5 / heure par IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: getClientIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Trop de tentatives d'inscription. Réessayez dans une heure.",
  },
});

/**
 * Refresh token — 60 / 15 min par IP
 */
export const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: getClientIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Trop de tentatives de rafraîchissement de token",
  },
});

/**
 * CRUD général — 300 / 15 min par IP
 */
export const crudLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: getClientIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Trop de requêtes. Veuillez patienter." },
});
