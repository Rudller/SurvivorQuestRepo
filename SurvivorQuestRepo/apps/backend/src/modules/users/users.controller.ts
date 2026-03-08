import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
import { parseCreateUserDto, parseUpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AdminSessionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers() {
    return this.usersService.findAll();
  }

  @Post()
  async createUser(@Body() payload: unknown) {
    return this.usersService.create(parseCreateUserDto(payload));
  }

  @Put()
  async updateUser(@Body() payload: unknown) {
    return this.usersService.update(parseUpdateUserDto(payload));
  }
}
