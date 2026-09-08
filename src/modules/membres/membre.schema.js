import { z } from "zod";

const TELEPHONE_REGEX = /^\+?[0-9]{9,15}$/;

export const listMembresSchema = z.object({
  query: z.object({
    statut: z.enum(["ACTIF", "INACTIF", "BLOQUE"]).optional(),
    recherche: z.string().min(1).optional(),
    page: z.string().regex(/^\d+$/, "La page doit être un nombre").optional(),
    limit: z
      .string()
      .regex(/^\d+$/, "La limite doit être un nombre")
      .optional(),
  }),
});

export const membreIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("Identifiant de membre invalide"),
  }),
});

// Réservé à l'admin — le membre modifie ses propres infos via /api/auth/profile
export const updateMembreSchema = z.object({
  params: z.object({
    id: z.string().uuid("Identifiant de membre invalide"),
  }),
  body: z
    .object({
      nom: z.string().min(2).optional(),
      prenom: z.string().min(2).optional(),
      telephone: z
        .string()
        .regex(TELEPHONE_REGEX, "Numéro de téléphone invalide")
        .optional(),
      email: z.string().email("Adresse email invalide").nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Au moins un champ doit être fourni",
    }),
});