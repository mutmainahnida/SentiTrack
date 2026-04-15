import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthRepository } from './auth.repository';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    authSession: {
      create: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      authSession: {
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new AuthRepository(
      prismaService as unknown as PrismaService,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should call prisma.user.findUnique()', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user_1',
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hash',
      createdAt: new Date(),
    });

    await repository.findUserByEmail('john@example.com');

    expect(prismaService.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
    });
  });

  it('should call prisma.user.create()', async () => {
    const now = new Date();
    prismaService.user.create.mockResolvedValue({
      id: 'user_1',
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hash',
      createdAt: now,
    });

    await repository.createUser({
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hash',
    });

    expect(prismaService.user.create).toHaveBeenCalledTimes(1);
    expect(prismaService.user.create).toHaveBeenCalledWith({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'hash',
      },
    });
  });

  it('should call prisma.authSession.create()', async () => {
    const accessTokenExpiresAt = new Date('2026-04-16');
    const refreshTokenExpiresAt = new Date('2026-05-15');
    prismaService.authSession.create.mockResolvedValue({
      id: 'session_1',
      userId: 'user_1',
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    });

    await repository.createSession({
      userId: 'user_1',
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    });

    expect(prismaService.authSession.create).toHaveBeenCalledTimes(1);
    expect(prismaService.authSession.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      },
    });
  });

  it('should call prisma.authSession.delete()', async () => {
    prismaService.authSession.delete.mockResolvedValue({
      id: 'session_1',
      userId: 'user_1',
      accessTokenExpiresAt: new Date(),
      refreshTokenExpiresAt: new Date(),
    });

    await repository.deleteSession('session_1');

    expect(prismaService.authSession.delete).toHaveBeenCalledTimes(1);
    expect(prismaService.authSession.delete).toHaveBeenCalledWith({
      where: { id: 'session_1' },
    });
  });
});
