import { z } from "zod";

export const updateConfigurationSchema = z.object({
  body: z
    .object({
      montantCotisationJournaliere: z
        .number()
        .int()
        .positive("Le montant doit être positif")
        .optional(),
      seuilAvanceJoursMax: z
        .number()
        .int()
        .positive("Le seuil d'avance doit être positif")
        .optional(),
      delaiRegularisationJours: z
        .number()
        .int()
        .positive("Le délai de régularisation doit être positif")
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Au moins un champ doit être fourni",
    }),
});
