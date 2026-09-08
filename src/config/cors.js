import { env } from "./env.js";

/**
 * CORS pour API Web (SOS Yoon PWA)
 *
 * Contrairement à une app mobile, un navigateur envoie toujours
 * un header Origin — on peut donc restreindre précisément aux
 * domaines connus (frontend en dev + Vercel en prod), plutôt que
 * d'autoriser toutes les origines.
 *
 * Stratégie :
 * - Origin whitelistée → autorisé
 * - Origin absente (Postman, curl, tests serveur-à-serveur) → autorisé
 * - Origin du serveur lui-même en dev (Swagger UI) → autorisé
 * - Origin non reconnue → refusé
 */
export const getCorsOptions = () => {
  return {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (env.CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      if (env.IS_DEV && origin === `http://localhost:${env.PORT}`) {
        return callback(null, true);
      }

      callback(new Error(`Origine non autorisée par CORS : ${origin}`));
    },

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],

    credentials: false,

    maxAge: 86400,
  };
};
