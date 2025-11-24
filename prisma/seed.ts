import { PrismaClient } from '@prisma/client';
import { RoleEnum } from '../src/common/constants/roles.enum';
import * as bcrypt from 'bcrypt';

// Explicitly type the 'prisma' constant with 'PrismaClient'.
// This makes your code clearer and helps the linter.
const prisma: PrismaClient = new PrismaClient();

async function main() {
  // --- 1. SEED ROLES ---
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

  // --- 2. SEED SETTINGS (NEW) ---
  console.log('Seeding settings...');
  await prisma.setting.upsert({
    where: { key: 'MAX_FILE_SIZE' },
    // Important: leave update empty so we don't overwrite custom admin changes
    update: {},
    create: {
      key: 'MAX_FILE_SIZE',
      value: '5242880', // Default: 5MB (5 * 1024 * 1024)
    },
  });
  console.log(
    'Settings seeding complete (MAX_FILE_SIZE initialized if missing).',
  );
  // --- 3. SEED SUPERADMIN ---
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
