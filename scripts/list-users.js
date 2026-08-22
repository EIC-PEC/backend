const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
  });
  console.log(users);
  await prisma.$disconnect();
}

listUsers();
