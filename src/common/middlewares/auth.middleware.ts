/* eslint-disable @typescript-eslint/no-unused-vars */
import * as jwt from 'jsonwebtoken';
import { NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthPayload, AuthRequest } from '../interface/auth.types';
import { JwtService } from '@nestjs/jwt';

// export function AuthMiddleware(req: Request, res: Response, next: VoidFunction) {
//   const token = req.headers['authorization']?.split(' ')[1];
//   if (!token) throw new UnauthorizedException('Token missing');

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || '');
//     req.user = decoded;
//     next();
//   } catch (err: unknown) {
//     throw new UnauthorizedException('Invalid token');
//   }
// }

export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: AuthRequest, res: any, next: (error?: any) => void) {
    if (req.method === 'OPTIONS') return next();
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || Array.isArray(authHeader)) {
      throw new UnauthorizedException('Authorization header missing');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization header format');
    }
    const token = parts[1];
    try {
      const payload = this.jwtService.verify<AuthPayload>(token, {
        // if you want to pass options, you can. Usually secret is configured in JwtModule.
      });
      req.user = payload;
      next();
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
