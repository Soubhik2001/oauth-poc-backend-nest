import { PrismaClient } from '../generated/prisma/client';
import { RoleEnum } from '../src/common/constants/roles.enum';
import * as bcrypt from 'bcrypt';

// Explicitly type the 'prisma' constant with 'PrismaClient'.
// This makes your code clearer and helps the linter.
const prisma: PrismaClient = new PrismaClient();

async function main() {
  const roleNames = Object.values(RoleEnum);
  console.log('Seeding roles...');
  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name: name },
      update: {},
      create: { name: name },
    });
    console.log(`Created/Updated role: ${name}`);
  }
  console.log('Role seeding complete.');
  const superadminRole = await prisma.role.findUnique({
    where: { name: RoleEnum.SUPER_ADMIN },
  });

  if (superadminRole) {
    const hashedPassword = await bcrypt.hash('superadmin', 10);

    await prisma.user.upsert({
      where: { email: 'superadmin@app.com' },
      update: {},
      create: {
        name: 'Super Admin',
        email: 'superadmin@app.com',
        password: hashedPassword,
        roleId: superadminRole.id,
        country: 'Global',
      },
    });
    console.log('Created/Updated superadmin user.');
  }
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
