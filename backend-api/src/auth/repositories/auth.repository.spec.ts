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
  };

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
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
      password: 'hash',
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
      password: 'hash',
      createdAt: now,
      updatedAt: now,
    });

    await repository.createUser({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hash',
    });

    expect(prismaService.user.create).toHaveBeenCalledTimes(1);
    expect(prismaService.user.create).toHaveBeenCalledWith({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hash',
      },
    });
  });
});
