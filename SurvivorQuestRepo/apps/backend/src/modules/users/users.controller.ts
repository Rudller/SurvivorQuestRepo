import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedSessionGuard } from '../auth/guards/authenticated-session.guard';
import { AdminOnly } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  parseCreateUserDto,
  parseDeleteUserDto,
  parseUpdateUserDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

@Controller('users')
@AdminOnly()
@UseGuards(AuthenticatedSessionGuard, RolesGuard)
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

  @Delete()
  async deleteUser(@Body() payload: unknown) {
    return this.usersService.remove(parseDeleteUserDto(payload));
  }
}
