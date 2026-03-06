import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import {
  RealizationService,
  type CreateRealizationPayload,
  type UpdateRealizationPayload,
} from './realization.service';

@Controller('realizations')
export class RealizationController {
  constructor(private readonly realizationService: RealizationService) {}

  @Get()
  async getRealizations() {
    return this.realizationService.listRealizations();
  }

  @Post()
  async createRealization(@Body() payload: CreateRealizationPayload) {
    return this.realizationService.createRealization(payload);
  }

  @Put()
  async updateRealization(@Body() payload: UpdateRealizationPayload) {
    return this.realizationService.updateRealization(payload);
  }
}
