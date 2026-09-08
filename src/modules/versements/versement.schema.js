import { z } from "zod";

export const declarerVersementSchema = z.object({
  body: z.object({
    montant: z
      .number({ required_error: "Le montant est requis" })
      .int("Le montant doit être un nombre entier")
      .positive("Le montant doit être positif"),
  }),
});

export const versementIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("Identifiant de versement invalide"),
  }),
});

export const versementsQuerySchema = z.object({
  query: z.object({
    statut: z.enum(["EN_ATTENTE", "VALIDE", "REJETE"]).optional(),
    page: z.string().regex(/^\d+$/, "La page doit être un nombre").optional(),
    limit: z
      .string()
      .regex(/^\d+$/, "La limite doit être un nombre")
      .optional(),
  }),
});

export const versementsAdminQuerySchema = z.object({
  query: z.object({
    statut: z.enum(["EN_ATTENTE", "VALIDE", "REJETE"]).optional(),
    membreId: z.string().uuid("Identifiant de membre invalide").optional(),
    page: z.string().regex(/^\d+$/, "La page doit être un nombre").optional(),
    limit: z
      .string()
      .regex(/^\d+$/, "La limite doit être un nombre")
      .optional(),
  }),
});