import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // ✅ REGISTER — hash password, create user, return a token so the farmer is
  // logged in immediately after signing up
  async register(data: { name: string; email: string; password: string }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.usersService.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
    });

    return this.signToken(user.id, user.email, user.name);
  }

  // ✅ LOGIN — check email + password, return a token
  async login(data: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(data.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(data.password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.signToken(user.id, user.email, user.name);
  }

  // 🔑 Build the JWT + a safe (no password) user object for the frontend
  private signToken(userId: number, email: string, name: string) {
    const token = this.jwtService.sign({ sub: userId, email });

    return {
      accessToken: token,
      user: { id: userId, email, name },
    };
  }
}
