import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
import {
  parseCreateStationDto,
  parseDeleteStationDto,
  parseUpdateStationDto,
  toCreateStationEntity,
  toUpdateStationEntity,
} from './dto/station.dto';
import { StationService } from './station.service';

@Controller(['station', 'api/station'])
@UseGuards(AdminSessionGuard)
export class StationController {
  constructor(private readonly stationService: StationService) {}

  @Get()
  async getStations() {
    return this.stationService.listTemplateStations();
  }

  @Post()
  async createStation(@Body() payload: unknown) {
    const dto = parseCreateStationDto(payload);
    const parsedTimeLimit = this.stationService.parseTimeLimitSeconds(
      dto.timeLimitSeconds,
    );

    if (!parsedTimeLimit.ok) {
      throw new BadRequestException('Invalid payload');
    }

    return this.stationService.addTemplateStation(
      toCreateStationEntity(dto, parsedTimeLimit.value),
    );
  }

  @Put()
  async updateStation(@Body() payload: unknown) {
    const dto = parseUpdateStationDto(payload);
    const parsedTimeLimit = this.stationService.parseTimeLimitSeconds(
      dto.timeLimitSeconds,
    );

    if (!parsedTimeLimit.ok) {
      throw new BadRequestException('Invalid payload');
    }

    const current = await this.stationService.findStationById(dto.id);

    if (!current || !this.stationService.isTemplateStation(current)) {
      throw new NotFoundException('Station not found');
    }

    return this.stationService.replaceTemplateStation(
      toUpdateStationEntity(current, dto, parsedTimeLimit.value),
    );
  }

  @Delete()
  async deleteStation(@Body() payload: unknown) {
    const dto = parseDeleteStationDto(payload);

    const current = await this.stationService.findStationById(dto.id);

    if (!current || !this.stationService.isTemplateStation(current)) {
      throw new NotFoundException('Station not found');
    }

    if (current.name !== dto.confirmName) {
      throw new BadRequestException('Station name confirmation does not match');
    }

    await this.stationService.removeStationById(dto.id);
    return { id: dto.id };
  }
}
