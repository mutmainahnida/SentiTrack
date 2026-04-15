import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../repositories/users.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

const ADMIN_ROLE_ID = 1;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findAll(params: { skip?: number; take?: number; search?: string }) {
    const { skip = 0, take = 20, search } = params;
    const { users, total } = await this.usersRepository.findAll({ skip, take, search });

    return {
      users: users.map((u) => {
        const safeUser = this.sanitize(u);
        delete (safeUser as any).createdAt;
        delete (safeUser as any).updatedAt;
        return safeUser;
      }),
      paging: { total, skip, take },
    };
  }

  async findById(id: string, currentEmail: string, currentRoleId: number) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isAdmin = currentRoleId === ADMIN_ROLE_ID;
    const isSelf = currentEmail === user.email;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return this.sanitize(user);
  }

  async findByEmail(email: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitize(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    return this.sanitize(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentEmail: string,
    currentRoleId: number,
  ) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isAdmin = currentRoleId === ADMIN_ROLE_ID;
    const isSelf = currentEmail === user.email;

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('You can only update your own profile');
    }

    if (dto.email && dto.email !== user.email) {
      const emailTaken = await this.usersRepository.findByEmail(dto.email);
      if (emailTaken) {
        throw new BadRequestException('Email already in use');
      }
    }

    const data: {
      name?: string;
      email?: string;
      password?: string;
    } = {};
    if (dto.name) data.name = dto.name;
    if (dto.email) data.email = dto.email;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    const updated = await this.usersRepository.update(id, data);
    return this.sanitize(updated);
  }

  async delete(id: string, currentEmail: string, currentRoleId: number) {
    if (currentRoleId !== ADMIN_ROLE_ID) {
      throw new ForbiddenException('Only admin can delete users');
    }

    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email === currentEmail) {
      throw new BadRequestException('Admin cannot delete their own account');
    }

    await this.usersRepository.delete(id);
  }

  private sanitize<T extends { password?: string; role?: { createdAt?: Date; updatedAt?: Date } }>(user: T) {
    const { password: _pw, ...safeUser } = user;
    if (safeUser.role) {
      delete safeUser.role.createdAt;
      delete safeUser.role.updatedAt;
    }
    return safeUser;
  }
}