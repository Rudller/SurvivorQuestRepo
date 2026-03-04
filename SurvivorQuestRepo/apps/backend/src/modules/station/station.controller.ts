import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Post,
  Put,
} from '@nestjs/common';
import { StationService, type StationType } from './station.service';

type CreateStationPayload = {
  name?: string;
  type?: StationType;
  description?: string;
  imageUrl?: string;
  points?: number;
  timeLimitSeconds?: number;
};

type UpdateStationPayload = {
  id?: string;
  name?: string;
  type?: StationType;
  description?: string;
  imageUrl?: string;
  points?: number;
  timeLimitSeconds?: number;
};

type DeleteStationPayload = {
  id?: string;
  confirmName?: string;
};

@Controller(['station', 'api/station'])
export class StationController {
  constructor(private readonly stationService: StationService) {}

  @Get()
  getStations() {
    return this.stationService.listTemplateStations();
  }

  @Post()
  createStation(@Body() payload: CreateStationPayload) {
    const parsedTimeLimit = this.stationService.parseTimeLimitSeconds(
      payload.timeLimitSeconds,
    );

    if (
      !payload?.name?.trim() ||
      !payload.description?.trim() ||
      !payload.type ||
      !['quiz', 'time', 'points'].includes(payload.type) ||
      typeof payload.points !== 'number' ||
      payload.points <= 0 ||
      !parsedTimeLimit.ok
    ) {
      throw new BadRequestException('Invalid payload');
    }

    const now = new Date().toISOString();
    return this.stationService.addTemplateStation({
      id: crypto.randomUUID(),
      name: payload.name.trim(),
      type: payload.type,
      description: payload.description.trim(),
      imageUrl:
        payload.imageUrl?.trim() ||
        `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
          payload.name.trim(),
        )}`,
      points: Math.round(payload.points),
      timeLimitSeconds: parsedTimeLimit.value,
      createdAt: now,
      updatedAt: now,
    });
  }

  @Put()
  updateStation(@Body() payload: UpdateStationPayload) {
    const parsedTimeLimit = this.stationService.parseTimeLimitSeconds(
      payload.timeLimitSeconds,
    );

    if (
      !payload?.id?.trim() ||
      !payload.name?.trim() ||
      !payload.description?.trim() ||
      !payload.type ||
      !['quiz', 'time', 'points'].includes(payload.type) ||
      typeof payload.points !== 'number' ||
      payload.points <= 0 ||
      !parsedTimeLimit.ok
    ) {
      throw new BadRequestException('Invalid payload');
    }

    const current = this.stationService.findStationById(payload.id);

    if (!current || !this.stationService.isTemplateStation(current)) {
      throw new NotFoundException('Station not found');
    }

    return this.stationService.replaceTemplateStation({
      ...current,
      name: payload.name.trim(),
      type: payload.type,
      description: payload.description.trim(),
      imageUrl:
        payload.imageUrl?.trim() ||
        `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
          payload.name.trim(),
        )}`,
      points: Math.round(payload.points),
      timeLimitSeconds: parsedTimeLimit.value,
      updatedAt: new Date().toISOString(),
    });
  }

  @Delete()
  deleteStation(@Body() payload: DeleteStationPayload) {
    if (!payload?.id?.trim() || !payload.confirmName?.trim()) {
      throw new BadRequestException('Invalid payload');
    }

    const current = this.stationService.findStationById(payload.id);

    if (!current || !this.stationService.isTemplateStation(current)) {
      throw new NotFoundException('Station not found');
    }

    if (current.name !== payload.confirmName.trim()) {
      throw new BadRequestException('Station name confirmation does not match');
    }

    this.stationService.removeStationById(payload.id);
    return { id: payload.id };
  }
}
