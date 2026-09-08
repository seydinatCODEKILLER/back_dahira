import { env } from "./env.js";

export const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Dahira Cotisation API",
      version: "1.0.0",
      description:
        "API de gestion des cotisations journalières d'une dahira — suivi des versements, des avances, des soldes et des alertes de régularisation pour les membres et le trésorier.",
      contact: {
        name: "Support Dahira Cotisation",
        email: "support@dahira-cotisation.com",
      },
      license: {
        name: "MIT",
        url: "https://spdx.org/licenses/MIT.html",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Serveur de développement",
      },
      {
        url: "https://back-dahira.onrender.com",
        description: "Serveur de production",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        // ── Schémas communs ────────────────────────────────────

        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Erreur de validation" },
            errors: {
              type: "object",
              nullable: true,
              description: "Détail des erreurs par champ, si applicable",
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Opération réussie" },
            data: { type: "object" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", example: 143 },
            totalPages: { type: "integer", example: 8 },
            hasNext: { type: "boolean", example: true },
            hasPrev: { type: "boolean", example: false },
          },
        },

        // ── Authentification ───────────────────────────────────

        Membre: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            matricule: { type: "string", example: "DHR-2026-0042" },
            nom: { type: "string", example: "Ndiaye" },
            prenom: { type: "string", example: "Fatou" },
            telephone: { type: "string", example: "+221771234567" },
            email: {
              type: "string",
              nullable: true,
              example: "fatou.ndiaye@email.com",
            },
            avatar: {
              type: "string",
              nullable: true,
              example: "https://res.cloudinary.com/.../avatar_123.jpg",
            },
            role: {
              type: "string",
              enum: ["ADMIN", "MEMBRE"],
              example: "MEMBRE",
            },
            statut: {
              type: "string",
              enum: ["ACTIF", "INACTIF", "BLOQUE"],
              example: "ACTIF",
            },
            dateInscription: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        MembreCreateRequest: {
          type: "object",
          required: ["nom", "prenom", "telephone", "password"],
          properties: {
            nom: { type: "string", example: "Ndiaye" },
            prenom: { type: "string", example: "Fatou" },
            telephone: { type: "string", example: "+221771234567" },
            email: {
              type: "string",
              nullable: true,
              example: "fatou.ndiaye@email.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "MotDePasse123!",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["telephone", "password"],
          properties: {
            telephone: { type: "string", example: "+221771234567" },
            password: {
              type: "string",
              format: "password",
              example: "MotDePasse123!",
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            membre: { $ref: "#/components/schemas/Membre" },
            accessToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            refreshToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
        RefreshRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" },
          },
        },
        RefreshResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
          },
        },

        // ── Configuration ───────────────────────────────────────

        Configuration: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            montantCotisationJournaliere: { type: "integer", example: 100 },
            seuilAvanceJoursMax: { type: "integer", example: 30 },
            delaiRegularisationJours: { type: "integer", example: 2 },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ── Cotisations ──────────────────────────────────────────

        Cotisation: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            membreId: { type: "string", format: "uuid" },
            date: { type: "string", format: "date", example: "2026-09-02" },
            montantDu: { type: "integer", example: 100 },
            statut: {
              type: "string",
              enum: ["PAYE", "EN_ATTENTE", "RETARD"],
              example: "EN_ATTENTE",
            },
            versementId: { type: "string", format: "uuid", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ── Versements ───────────────────────────────────────────

        Versement: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            membreId: { type: "string", format: "uuid" },
            montant: { type: "integer", example: 500 },
            nombreJours: { type: "integer", example: 5 },
            periodeDebut: { type: "string", format: "date" },
            periodeFin: { type: "string", format: "date" },
            statut: {
              type: "string",
              enum: ["EN_ATTENTE", "VALIDE", "REJETE"],
              example: "EN_ATTENTE",
            },
            valideParId: { type: "string", format: "uuid", nullable: true },
            dateValidation: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        VersementCreateRequest: {
          type: "object",
          required: ["montant"],
          properties: {
            montant: {
              type: "integer",
              example: 500,
              description:
                "Montant en FCFA, multiple du montant de cotisation journalière",
            },
          },
        },
        VersementValidationRequest: {
          type: "object",
          required: ["statut"],
          properties: {
            statut: {
              type: "string",
              enum: ["VALIDE", "REJETE"],
              example: "VALIDE",
            },
          },
        },

        // ── Solde ────────────────────────────────────────────────

        Solde: {
          type: "object",
          properties: {
            membreId: { type: "string", format: "uuid" },
            soldeJours: {
              type: "integer",
              example: -1,
              description: "> 0 = avance, < 0 = retard",
            },
            soldeMontant: { type: "integer", example: -100 },
            dernierJourPaye: { type: "string", format: "date", nullable: true },
            statut: {
              type: "string",
              enum: ["A_JOUR", "EN_AVANCE", "EN_RETARD", "BLOQUE"],
              example: "EN_RETARD",
            },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ── Alertes ──────────────────────────────────────────────

        Alerte: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            membreId: { type: "string", format: "uuid" },
            type: {
              type: "string",
              enum: ["ECHEANCE", "RETARD"],
              example: "RETARD",
            },
            destinataire: {
              type: "string",
              enum: ["MEMBRE", "TRESORIER", "LES_DEUX"],
              example: "LES_DEUX",
            },
            message: {
              type: "string",
              example:
                "Votre solde est en retard de 2 jours, veuillez régulariser.",
            },
            estLue: { type: "boolean", example: false },
            dateEnvoi: { type: "string", format: "date-time" },
          },
        },

        // ── Audit ────────────────────────────────────────────────

        AuditLog: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            action: { type: "string", example: "VERSEMENT_VALIDE" },
            entite: { type: "string", example: "Versement" },
            entiteId: { type: "string", format: "uuid" },
            auteurId: { type: "string", format: "uuid", nullable: true },
            details: { type: "object", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
      parameters: {
        pageQuery: {
          in: "query",
          name: "page",
          required: false,
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Numéro de page",
        },
        limitQuery: {
          in: "query",
          name: "limit",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          description: "Taille de la page",
        },
        statutMembreQuery: {
          in: "query",
          name: "statut",
          required: false,
          schema: { type: "string", enum: ["ACTIF", "INACTIF", "BLOQUE"] },
          description: "Filtrer les membres par statut",
        },
        statutCotisationQuery: {
          in: "query",
          name: "statut",
          required: false,
          schema: { type: "string", enum: ["PAYE", "EN_ATTENTE", "RETARD"] },
          description: "Filtrer les cotisations par statut",
        },
        statutVersementQuery: {
          in: "query",
          name: "statut",
          required: false,
          schema: { type: "string", enum: ["EN_ATTENTE", "VALIDE", "REJETE"] },
          description: "Filtrer les versements par statut",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/modules/**/*.routes.js", "./src/modules/**/*.controller.js"],
};
