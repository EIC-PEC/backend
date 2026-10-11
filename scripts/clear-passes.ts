import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all passes and registrations from DB...');

  const deletedCheckIns = await prisma.checkIn.deleteMany({});
  console.log(`Deleted ${deletedCheckIns.count} check-in records.`);

  const deletedRegistrations = await prisma.registration.deleteMany({});
  console.log(`Deleted ${deletedRegistrations.count} registration (pass) records.`);

  const deletedPayments = await prisma.payment.deleteMany({});
  console.log(`Deleted ${deletedPayments.count} payment records.`);

  console.log('✅ All stored passes cleared successfully.');
}

main()
  .catch((e) => {
    console.error('Error clearing passes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
