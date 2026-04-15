import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Swap roles: admin=1, user=2
  // Use temp name to avoid unique constraint on title during swap
  const existingRole1 = await prisma.role.findUnique({ where: { id: 1 } });
  const existingRole2 = await prisma.role.findUnique({ where: { id: 2 } });

  if (existingRole1 && existingRole1.title === 'user' && existingRole2 && existingRole2.title === 'admin') {
    // Need to swap — use temp name to avoid unique conflict
    await prisma.role.update({ where: { id: 1 }, data: { title: '_temp_admin' } });
    await prisma.role.update({ where: { id: 2 }, data: { title: 'user' } });
    await prisma.role.update({ where: { id: 1 }, data: { title: 'admin' } });
    console.log('Roles swapped: admin (id=1), user (id=2)');
  } else {
    // Create or upsert
    await prisma.role.upsert({
      where: { id: 1 },
      update: { title: 'admin' },
      create: { id: 1, title: 'admin' },
    });
    await prisma.role.upsert({
      where: { id: 2 },
      update: { title: 'user' },
      create: { id: 2, title: 'user' },
    });
    console.log('Roles seeded: admin (id=1), user (id=2)');
  }
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user12345', 10);

  await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: { roleId: 1 },
    create: {
      name: 'Admin',
      email: 'admin@gmail.com',
      password: adminPassword,
      roleId: 1,
    },
  });
  console.log('Admin user → roleId=1');

  await prisma.user.upsert({
    where: { email: 'user@gmail.com' },
    update: { roleId: 2 },
    create: {
      name: 'User',
      email: 'user@gmail.com',
      password: userPassword,
      roleId: 2,
    },
  });
  console.log('Regular user → roleId=2');

  // Also fix any other users that had the old roleId mapping
  await prisma.user.updateMany({
    where: { email: { notIn: ['admin@gmail.com', 'user@gmail.com'] } },
    data: { roleId: 2 },
  });
  console.log('All other users → roleId=2 (user)');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });