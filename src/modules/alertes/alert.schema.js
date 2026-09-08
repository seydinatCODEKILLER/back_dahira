import { z } from "zod";

export const alerteIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("Identifiant d'alerte invalide"),
  }),
});

export const mesAlertesQuerySchema = z.object({
  query: z.object({
    type: z.enum(["ECHEANCE", "RETARD"]).optional(),
    estLue: z.enum(["true", "false"]).optional(),
    page: z.string().regex(/^\d+$/, "La page doit être un nombre").optional(),
    limit: z
      .string()
      .regex(/^\d+$/, "La limite doit être un nombre")
      .optional(),
  }),
});

export const alertesAdminQuerySchema = z.object({
  query: z.object({
    membreId: z.string().uuid("Identifiant de membre invalide").optional(),
    type: z.enum(["ECHEANCE", "RETARD"]).optional(),
    destinataire: z.enum(["MEMBRE", "TRESORIER", "LES_DEUX"]).optional(),
    page: z.string().regex(/^\d+$/, "La page doit être un nombre").optional(),
    limit: z
      .string()
      .regex(/^\d+$/, "La limite doit être un nombre")
      .optional(),
  }),
});