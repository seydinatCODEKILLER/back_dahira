import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const auditLogQuerySchema = z.object({
  query: z.object({
    auteurId: z.string().uuid("Identifiant de l'auteur invalide").optional(),
    entite: z
      .enum(["Membre", "Versement", "Cotisation", "Configuration", "Solde"])
      .optional(),
    action: z.string().optional(), // Ex: "VERSEMENT_VALIDE", "VERSEMENT_DECLARE"
    dateDebut: z
      .string()
      .regex(DATE_REGEX, "Format attendu : YYYY-MM-DD")
      .optional(),
    dateFin: z
      .string()
      .regex(DATE_REGEX, "Format attendu : YYYY-MM-DD")
      .optional(),
    page: z.string().regex(/^\d+$/, "La page doit être un nombre").optional(),
    limit: z
      .string()
      .regex(/^\d+$/, "La limite doit être un nombre")
      .optional(),
  }),
});
