import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

export enum Role {
  Admin = 'Admin',
  Customer = 'Customer',
}