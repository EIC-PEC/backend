const { PrismaClient, PassType, Role } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRegistration() {
  const testEmail = `test_${Date.now()}@gmail.com`;
  console.log(`Testing registration for: ${testEmail}`);

  try {
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Test Attendee',
        phone: '9876543210',
        college: 'Punjab Engineering College',
        role: Role.DELEGATE,
      },
    });
    console.log('✓ User created successfully:', user.id);

    const reg = await prisma.registration.create({
      data: {
        passId: `PEC-${Math.floor(100000 + Math.random() * 900000)}`,
        userId: user.id,
        passType: PassType.STUDENT_GENERAL,
        amountPaid: 0,
        qrToken: `TOKEN_${Date.now()}`,
        tracks: ['AI & ML'],
        isCheckedIn: false,
      },
    });
    console.log('✓ Registration created successfully:', reg.id, reg.passId);

    // Clean up test user
    await prisma.registration.delete({ where: { id: reg.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✓ Cleaned up test record.');
  } catch (err) {
    console.error('❌ Registration test error:', err);
  }
}

testRegistration()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
