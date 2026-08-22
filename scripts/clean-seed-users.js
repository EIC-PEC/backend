const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanMockUsers() {
  console.log('--- PURGING UNUSED SEED USERS FROM MONGO ---');
  const dummyEmails = ['organizer@pecsummit.com', 'volunteer@pecsummit.com', 'investor@pecsummit.com'];

  const deleted = await prisma.user.deleteMany({
    where: {
      email: { in: dummyEmails },
    },
  });

  console.log(`Deleted ${deleted.count} dummy seed accounts.`);

  const remaining = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } });
  console.log('\n=== REMAINING LIVE USERS IN DATABASE ===');
  console.log(JSON.stringify(remaining, null, 2));
}

cleanMockUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
