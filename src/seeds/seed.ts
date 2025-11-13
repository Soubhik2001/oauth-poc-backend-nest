import { PrismaClient } from '../../generated/prisma/client.js';

const prisma = new PrismaClient();

async function main() {
  const roles = [
    'admin',
    'general_public',
    'medical_officer',
    'epidemiologist',
  ];

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Roles seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding roles:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
