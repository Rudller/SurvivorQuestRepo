import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
import type {
  CreateRealizationDto,
  UpdateRealizationDto,
} from './dto/realization.dto';
import { RealizationService } from './realization.service';

@Controller('realizations')
@UseGuards(AdminSessionGuard)
export class RealizationController {
  constructor(private readonly realizationService: RealizationService) {}

  @Get()
  async getRealizations() {
    return this.realizationService.listRealizations();
  }

  @Post()
  async createRealization(@Body() payload: CreateRealizationDto) {
    return this.realizationService.createRealization(payload);
  }

  @Put()
  async updateRealization(@Body() payload: UpdateRealizationDto) {
    return this.realizationService.updateRealization(payload);
  }
}
