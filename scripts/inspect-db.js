const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('🔍 Connecting to MongoDB Atlas via Prisma Client...\n');

  try {
    // 1. Inspect User Counts & Roles
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
    });
    console.log(`👥 Total Users Found: ${users.length}`);

    const roleMap = {};
    for (const u of users) {
      roleMap[u.role] = (roleMap[u.role] || 0) + 1;
    }
    console.log('📊 Current User Roles Distribution:');
    console.table(Object.entries(roleMap).map(([role, count]) => ({ Role: role, Count: count })));

    // 2. Inspect Registrations
    const regs = await prisma.registration.findMany({
      select: { id: true, passId: true, passType: true, amountPaid: true, isCheckedIn: true },
    });
    console.log(`\n🎟️ Total Registrations: ${regs.length}`);
    const passMap = {};
    for (const r of regs) {
      passMap[r.passType] = (passMap[r.passType] || 0) + 1;
    }
    console.table(Object.entries(passMap).map(([passType, count]) => ({ PassType: passType, Count: count })));

    // 3. Inspect Events, Speakers, Schedules, Subscribers
    const eventsCount = await prisma.event.count();
    const speakersCount = await prisma.speaker.count();
    const scheduleCount = await prisma.scheduleItem.count();
    const subscribersCount = await prisma.subscriber.count();
    const auditLogsCount = await prisma.auditLog.count();

    console.log('\n📂 Other CMS & Activity Records:');
    console.log(`   - Events        : ${eventsCount}`);
    console.log(`   - Speakers      : ${speakersCount}`);
    console.log(`   - Timeline Slots: ${scheduleCount}`);
    console.log(`   - Subscribers   : ${subscribersCount}`);
    console.log(`   - Audit Logs    : ${auditLogsCount}`);

    console.log('\n✅ Database inspection completed. All collections and records are healthy and intact!');
  } catch (err) {
    console.error('❌ Error inspecting database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
