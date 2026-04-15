import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
  }) {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
      },
    });
  }

  async createSession(data: {
    userId: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  }) {
    return this.prisma.authSession.create({
      data: {
        userId: data.userId,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
      },
    });
  }

  async deleteSession(sessionId: string) {
    return this.prisma.authSession.delete({
      where: { id: sessionId },
    });
  }
}
