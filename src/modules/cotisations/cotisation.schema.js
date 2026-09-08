import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const dateQueryFields = {
  dateDebut: z.string().regex(DATE_REGEX, "Format attendu : YYYY-MM-DD").optional(),
  dateFin: z.string().regex(DATE_REGEX, "Format attendu : YYYY-MM-DD").optional(),
  statut: z.enum(["PAYE", "EN_ATTENTE", "RETARD"]).optional(),
  page: z.string().regex(/^\d+$/, "La page doit être un nombre").optional(),
  limit: z.string().regex(/^\d+$/, "La limite doit être un nombre").optional(),
};

export const cotisationsQuerySchema = z.object({
  query: z.object(dateQueryFields),
});

export const cotisationsMembreSchema = z.object({
  params: z.object({
    membreId: z.string().uuid("Identifiant de membre invalide"),
  }),
  query: z.object(dateQueryFields),
});

export const membreIdParamSchema = z.object({
  params: z.object({
    membreId: z.string().uuid("Identifiant de membre invalide"),
  }),
});