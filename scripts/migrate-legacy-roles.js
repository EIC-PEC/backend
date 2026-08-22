const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateRoles() {
  console.log('Connecting to MongoDB Atlas via Prisma Raw Command...');

  try {
    // 1. Update SUPER_ADMIN -> ADMIN
    const resSuperAdmin = await prisma.$runCommandRaw({
      update: 'User',
      updates: [
        {
          q: { role: 'SUPER_ADMIN' },
          u: { $set: { role: 'ADMIN' } },
          multi: true,
        },
      ],
    });
    console.log('Migrated SUPER_ADMIN -> ADMIN:', resSuperAdmin);

    // 2. Update ORGANIZER -> ADMIN
    const resOrganizer = await prisma.$runCommandRaw({
      update: 'User',
      updates: [
        {
          q: { role: 'ORGANIZER' },
          u: { $set: { role: 'ADMIN' } },
          multi: true,
        },
      ],
    });
    console.log('Migrated ORGANIZER -> ADMIN:', resOrganizer);

    // 3. Update VOLUNTEER_CHECKIN -> GATE
    const resGate = await prisma.$runCommandRaw({
      update: 'User',
      updates: [
        {
          q: { role: 'VOLUNTEER_CHECKIN' },
          u: { $set: { role: 'GATE' } },
          multi: true,
        },
      ],
    });
    console.log('Migrated VOLUNTEER_CHECKIN -> GATE:', resGate);

    // 4. Update INVESTOR / DELEGATE -> USER
    const resUser = await prisma.$runCommandRaw({
      update: 'User',
      updates: [
        {
          q: { role: { $in: ['INVESTOR', 'DELEGATE'] } },
          u: { $set: { role: 'USER' } },
          multi: true,
        },
      ],
    });
    console.log('Migrated INVESTOR/DELEGATE -> USER:', resUser);

    console.log('\n✅ All legacy MongoDB user roles migrated successfully to (ADMIN, GATE, USER)!');
  } catch (err) {
    console.error('Error migrating roles:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrateRoles();
