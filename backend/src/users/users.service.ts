import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';

import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // ✅ CREATE USER (password must already be hashed by AuthService)
  async create(data: { name: string; email: string; password: string }): Promise<User> {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email: ILike(cleanEmail) } });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = this.userRepo.create({
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password,
    });
    return this.userRepo.save(user);
  }

  // ✅ FIND BY EMAIL (case-insensitive & trimmed)
  async findByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    const cleanEmail = email.trim();
    return this.userRepo.findOne({ where: { email: ILike(cleanEmail) } });
  }

  // ✅ FIND BY ID (used by JwtStrategy to attach req.user)
  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  // ✅ UPDATE PASSWORD
  async updatePassword(email: string, newHashedPassword: string): Promise<User> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User with this email not found');
    }
    user.password = newHashedPassword;
    return this.userRepo.save(user);
  }
}
