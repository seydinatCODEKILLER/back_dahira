import { z } from "zod";

const TELEPHONE_REGEX = /^\+?[0-9]{9,15}$/;
const PIN_REGEX = /^\d{4}$/; // 4 chiffres exactement

export const loginSchema = z.object({
  body: z.object({
    telephone: z
      .string()
      .regex(TELEPHONE_REGEX, "Numéro de téléphone invalide"),
    codePin: z
      .string()
      .regex(PIN_REGEX, "Le code PIN doit contenir exactement 4 chiffres"),
  }),
});

// Réservé à l'admin — inscription d'un membre
export const registerSchema = z.object({
  body: z.object({
    nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
    telephone: z
      .string()
      .regex(TELEPHONE_REGEX, "Numéro de téléphone invalide"),
    email: z.string().email("Adresse email invalide").optional(),
    codePin: z
      .string()
      .regex(PIN_REGEX, "Le code PIN doit contenir exactement 4 chiffres"),
    role: z.enum(["ADMIN", "MEMBRE"]).optional(),
  }),
});

// ─── NOUVEAU : Schéma pour changer de code PIN ───
export const changePinSchema = z.object({
  body: z.object({
    ancienCodePin: z
      .string()
      .regex(PIN_REGEX, "L'ancien code PIN est invalide"),
    nouveauCodePin: z
      .string()
      .regex(PIN_REGEX, "Le nouveau code PIN doit contenir exactement 4 chiffres"),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Le refresh token est requis"),
  }),
});

export const updateProfileSchema = z.object({
  body: z
    .object({
      nom: z.string().min(2).optional(),
      prenom: z.string().min(2).optional(),
      email: z.string().email("Adresse email invalide").optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Au moins un champ doit être fourni",
    }),
});

// Réservé à l'admin — activer / désactiver / bloquer un membre
export const setStatutSchema = z.object({
  body: z.object({
    membreId: z.string().uuid("Identifiant de membre invalide"),
    statut: z.enum(["ACTIF", "INACTIF", "BLOQUE"], {
      required_error: "Le statut est requis",
    }),
  }),
});