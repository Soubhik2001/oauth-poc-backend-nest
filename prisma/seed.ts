import { PrismaClient } from '../generated/prisma/client';
import { RoleEnum } from '../src/common/constants/roles.enum';

// Explicitly type the 'prisma' constant with 'PrismaClient'.
// This makes your code clearer and helps the linter.
const prisma: PrismaClient = new PrismaClient();

async function main() {
  const roleNames = Object.values(RoleEnum);

  console.log('Seeding roles...');
  for (const name of roleNames) {
    // This call is now type-safe because the linter knows
    // 'prisma' is a 'PrismaClient' and has a 'role' property.
    await prisma.role.upsert({
      where: { name: name },
      update: {},
      create: { name: name },
    });
    console.log(`Created/Updated role: ${name}`);
  }
  console.log('Role seeding complete.');
}

main()
  .catch((e: unknown) => {
    // Also good practice to type 'e' as 'unknown'
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // This is now type-safe and known to exist.
    await prisma.$disconnect();
  });
