const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- CONNECTING TO MONGODB ---');
  const users = await prisma.user.findMany();
  console.log(`\n=== USERS COUNT: ${users.length} ===`);
  users.forEach((u) => {
    console.log(`[User] ${u.id} | ${u.name} | ${u.email} | ${u.role} | Created: ${u.createdAt}`);
  });

  const registrations = await prisma.registration.findMany({
    include: { user: true, payment: true },
  });
  console.log(`\n=== REGISTRATIONS COUNT: ${registrations.length} ===`);
  registrations.forEach((r) => {
    console.log(`[Pass] ${r.passId} | Attendee: ${r.user?.name} (${r.user?.email}) | Tier: ${r.passType} | CheckedIn: ${r.isCheckedIn}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
