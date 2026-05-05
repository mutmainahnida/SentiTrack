import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.findUnique({ where: { id: 1 } });
  if (!adminRole) {
    await prisma.role.create({ data: { id: 1, title: 'admin' } });
    console.log('Role seeded: admin (id=1)');
  }

  const userRole = await prisma.role.findUnique({ where: { id: 2 } });
  if (!userRole) {
    await prisma.role.create({ data: { id: 2, title: 'user' } });
    console.log('Role seeded: user (id=2)');
  }

  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@gmail.com' } });
  if (!adminUser) {
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@gmail.com',
        password: adminPassword,
        roleId: 1,
      },
    });
    console.log('Admin user seeded (roleId=1)');
  }

  const regularUser = await prisma.user.findUnique({ where: { email: 'user@gmail.com' } });
  if (!regularUser) {
    const userPassword = await bcrypt.hash('user12345', 10);
    await prisma.user.create({
      data: {
        name: 'User',
        email: 'user@gmail.com',
        password: userPassword,
        roleId: 2,
      },
    });
    console.log('Regular user seeded (roleId=2)');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });