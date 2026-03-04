import { BadRequestException, Body, Controller, Get, Post, Put } from '@nestjs/common';
import { UsersService, type UserRole, type UserStatus } from './users.service';

type CreateUserPayload = {
  displayName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  photoUrl?: string;
};

type UpdateUserPayload = {
  id?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  photoUrl?: string;
};

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers() {
    return this.usersService.findAll();
  }

  @Post()
  createUser(@Body() payload: CreateUserPayload) {
    if (!payload.displayName?.trim() || !payload.email?.trim() || !payload.role || !payload.status) {
      throw new BadRequestException('Invalid payload');
    }

    return this.usersService.create({
      displayName: payload.displayName,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      status: payload.status,
      photoUrl: payload.photoUrl,
    });
  }

  @Put()
  updateUser(@Body() payload: UpdateUserPayload) {
    if (!payload.id?.trim()) {
      throw new BadRequestException('User id is required');
    }

    return this.usersService.update({
      id: payload.id,
      displayName: payload.displayName,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      status: payload.status,
      photoUrl: payload.photoUrl,
    });
  }
}
