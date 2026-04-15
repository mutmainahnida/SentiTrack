import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
  }): Promise<{ users: Prisma.UserGetPayload<{ include: { role: true } }>[]; total: number }> {
    const { skip = 0, take = 20, search } = params;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { role: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    roleId?: number;
  }) {
    return this.prisma.user.create({
      data,
      include: { role: true },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      roleId?: number;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}