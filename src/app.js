import express from "express";
import cors from "cors";
import logger from "./config/logger.js";
import { getCorsOptions } from "./config/cors.js";
import { generalLimiter } from "./config/rateLimiter.js";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { swaggerOptions } from "./config/swagger.js";
import { authRoutes } from "./modules/auth/auth.module.js";
import {
  errorHandler,
  notFoundHandler,
} from "./shared/middlewares/error.middleware.js";
import { membreRoutes } from "./modules/membres/membre.module.js";
import { configurationRoutes } from "./modules/configuration/configuration.module.js";
import { cotisationRoutes } from "./modules/cotisations/cotisation.module.js";
import { versementRoutes } from "./modules/versements/versement.module.js";
import { soldeRoutes } from "./modules/soldes/solde.module.js";
import { alerteRoutes } from "./modules/alertes/alert.module.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.module.js";
import { auditLogRoutes } from "./modules/audit-logs/audit-log.module.js";

const app = express();
const specs = swaggerJSDoc(swaggerOptions);

// ✅ CRITICAL: Trust proxy EN PREMIER (avant TOUS les middlewares)
app.set("trust proxy", 1);

// ✅ Middlewares globaux dans le bon ordre
app.use(cors(getCorsOptions()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Documentation Swagger
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(specs));

// ✅ Rate limiter général appliqué à toutes les routes API
app.use("/api", generalLimiter);

// Logger middleware
logger.info("API middlewares initialized");

// ✅ Route racine (/)
app.get("/", (req, res) => {
  res.status(200).json({
    name: "Mon API",
    version: "1.0.0",
    description: "Bienvenue sur l'API, accédez à /api/docs pour la documentation",
    endpoints: {
      docs: "/api/docs",
      health: "/health",
    },
  });
});

// ✅ Route de santé (/health)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    message: "API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(), // Optionnel : temps d'exécution depuis le dernier redémarrage
  });
});

// Routes API
app.use("/api/auth", authRoutes);
app.use("/api/membres", membreRoutes);
app.use("/api/configuration", configurationRoutes);
app.use("/api/cotisations", cotisationRoutes);
app.use("/api/versements", versementRoutes);
app.use("/api/soldes", soldeRoutes);
app.use("/api/alertes", alerteRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Error logger
app.all("/{*path}", notFoundHandler);
app.use(errorHandler);

export default app;