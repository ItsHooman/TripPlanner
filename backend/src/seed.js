/**
 * seed.js
 * Seeds the database with a demo user + demo trip.
 * Run: node src/seed.js
 */

import "dotenv/config"; // Loads .env automatically (DATABASE_URL)

// Prisma 7: use a Postgres driver adapter
import { PrismaPg } from "@prisma/adapter-pg";

// Node/ESM interop for @prisma/client in some setups
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

// Create the adapter using DATABASE_URL from .env
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Prisma client MUST be created with options in Prisma 7
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1) Create a demo user (or update if already exists)
  const user = await prisma.user.upsert({
    where: { email: "demo@tripplanner.com" },
    update: { name: "Demo User" },
    create: {
      email: "demo@tripplanner.com",
      password: "password123", // MVP only (we will hash later)
      name: "Demo User",
    },
  });

  // 2) Create a demo trip for that user
  const trip = await prisma.trip.create({
    data: {
      title: "Amsterdam trip",
      destination: "Amsterdam",
      startDate: new Date("2026-07-10"),
      endDate: new Date("2026-07-14"),
      budget: 1500,
      vibe: "techno",
      planJson: {
        summary: "Seeded trip plan JSON (MVP).",
        notes: ["Replace with real plan generation later"],
      },
      user: { connect: { id: user.id } },
    },
  });

  console.log("✅ Seed complete!");
  console.log({ user, trip });
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    // Always disconnect so Node exits cleanly
    await prisma.$disconnect();
  });
