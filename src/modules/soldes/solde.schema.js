import { z } from "zod";

export const soldeMembreParamSchema = z.object({
  params: z.object({
    membreId: z.string().uuid("Identifiant de membre invalide"),
  }),
});

export const soldesQuerySchema = z.object({
  query: z.object({
    statut: z.enum(["A_JOUR", "EN_AVANCE", "EN_RETARD", "BLOQUE"]).optional(),
    page: z.string().regex(/^\d+$/, "La page doit être un nombre").optional(),
    limit: z
      .string()
      .regex(/^\d+$/, "La limite doit être un nombre")
      .optional(),
  }),
});