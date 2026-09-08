import { prisma } from "../src/config/database.js";
import { hashPassword } from "../src/shared/utils/hasher.js";

// ─── Paramètres de l'admin (surchargeables via .env) ───────────
const ADMIN_TELEPHONE = process.env.SEED_ADMIN_TELEPHONE || "+221770000000";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@1234";
const ADMIN_NOM = process.env.SEED_ADMIN_NOM || "Admin";
const ADMIN_PRENOM = process.env.SEED_ADMIN_PRENOM || "Dahira";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || null;

// ─── Création de l'administrateur ──────────────────────────────
async function seedAdmin() {
  const existing = await prisma.membre.findUnique({
    where: { telephone: ADMIN_TELEPHONE },
  });

  if (existing) {
    console.log(`ℹ️  Admin déjà existant (${existing.telephone}) — aucune action.`);
    return existing;
  }

  const hashedPassword = await hashPassword(ADMIN_PASSWORD);

  const total = await prisma.membre.count();
  const matricule = `DHR-${new Date().getFullYear()}-${String(total + 1).padStart(4, "0")}`;

  const admin = await prisma.membre.create({
    data: {
      matricule,
      nom: ADMIN_NOM,
      prenom: ADMIN_PRENOM,
      telephone: ADMIN_TELEPHONE,
      email: ADMIN_EMAIL,
      motDePasse: hashedPassword,
      role: "ADMIN",
      statut: "ACTIF",
    },
  });

  console.log("✅ Compte administrateur créé :");
  console.log(`   Matricule    : ${admin.matricule}`);
  console.log(`   Téléphone    : ${admin.telephone}`);
  console.log(`   Mot de passe : ${ADMIN_PASSWORD}`);
  console.log("   ⚠️  Changez ce mot de passe dès la première connexion.\n");

  return admin;
}

// ─── Création de la configuration par défaut ───────────────────
async function seedConfiguration() {
  const existing = await prisma.configuration.findFirst();

  if (existing) {
    console.log("ℹ️  Configuration déjà existante — aucune action.");
    return existing;
  }

  const config = await prisma.configuration.create({
    data: {
      montantCotisationJournaliere: 100,
      seuilAvanceJoursMax: 30,
      delaiRegularisationJours: 2,
    },
  });

  console.log("✅ Configuration par défaut créée (100 FCFA/jour, seuil 30j, délai 2j).");

  return config;
}

// ─── Point d'entrée ─────────────────────────────────────────────
async function main() {
  console.log("🌱 Démarrage du seed...\n");
  await seedAdmin();
  await seedConfiguration();
  console.log("\n🌱 Seed terminé.");
}

main()
  .catch((err) => {
    console.error("❌ Erreur pendant le seed :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });