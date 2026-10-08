import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // ✅ CREATE USER (password must already be hashed by AuthService)
  async create(data: { name: string; email: string; password: string }): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email: data.email } });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  // ✅ FIND BY EMAIL (used by AuthService during login)
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  // ✅ FIND BY ID (used by JwtStrategy to attach req.user)
  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }
}
