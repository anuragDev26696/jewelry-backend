/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from 'src/schemas/user.schema';
import { LoginResponse } from 'src/common/interface/generic.interface';
import { JwtPayload } from 'jsonwebtoken';
import { UserType } from 'src/common/interface/user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private async validateUser(email: string, pass: string): Promise<Omit<UserType, 'password'>> {
    const user = await this.usersService.findByEmail(email, false);
    if (!user) throw new NotFoundException('User not found');

    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<UserType, 'password'>;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const validatedUser = await this.validateUser(email, password);

    const payload: JwtPayload = {
      sub: validatedUser.uuid,
      email: validatedUser.email,
      role: validatedUser.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: validatedUser,
    };
  }

  async changePassword(email: string, password: string): Promise<User> {
    const user = await this.usersService.findDocumentByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    user.password = hashedPassword;
    await user.save();
    return user.toObject() as User;
  }
}
