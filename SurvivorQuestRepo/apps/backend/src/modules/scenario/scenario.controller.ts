import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { StationService } from '../station/station.service';
import { ScenarioService } from './scenario.service';

type CreateScenarioPayload = {
  name?: string;
  description?: string;
  stationIds?: unknown;
};

type UpdateScenarioPayload = {
  id?: string;
  name?: string;
  description?: string;
  stationIds?: unknown;
};

type DeleteScenarioPayload = {
  id?: string;
  confirmName?: string;
};

type CloneScenarioPayload = {
  sourceId?: string;
};

function sanitizeStationIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

function isValidName(value: unknown) {
  return typeof value === 'string' && value.trim().length >= 3;
}

@Controller('scenario')
export class ScenarioController {
  constructor(
    private readonly scenarioService: ScenarioService,
    private readonly stationService: StationService,
  ) {}

  @Get()
  getScenarios() {
    return this.scenarioService.listScenarios();
  }

  @Post()
  createScenario(@Body() payload: CreateScenarioPayload) {
    const stationIds = sanitizeStationIds(payload.stationIds);

    if (!isValidName(payload.name) || stationIds.length === 0) {
      throw new BadRequestException('Invalid payload');
    }

    if (this.stationService.findStationsByIds(stationIds).length !== stationIds.length) {
      throw new BadRequestException('Invalid station ids');
    }

    const now = new Date().toISOString();
    return this.scenarioService.addScenario({
      id: crypto.randomUUID(),
      name: payload.name!.trim(),
      description:
        typeof payload.description === 'string' ? payload.description.trim() : '',
      stationIds,
      createdAt: now,
      updatedAt: now,
    });
  }

  @Put()
  updateScenario(@Body() payload: UpdateScenarioPayload) {
    const stationIds = sanitizeStationIds(payload.stationIds);

    if (!payload.id?.trim() || !isValidName(payload.name) || stationIds.length === 0) {
      throw new BadRequestException('Invalid payload');
    }

    if (this.stationService.findStationsByIds(stationIds).length !== stationIds.length) {
      throw new BadRequestException('Invalid station ids');
    }

    const currentScenario = this.scenarioService.findScenarioById(payload.id);

    if (!currentScenario) {
      throw new NotFoundException('Scenario not found');
    }

    return this.scenarioService.replaceScenario({
      ...currentScenario,
      name: payload.name!.trim(),
      description:
        typeof payload.description === 'string' ? payload.description.trim() : '',
      stationIds,
      updatedAt: new Date().toISOString(),
    });
  }

  @Delete()
  deleteScenario(@Body() payload: DeleteScenarioPayload) {
    if (!payload.id?.trim() || !payload.confirmName?.trim()) {
      throw new BadRequestException('Invalid payload');
    }

    const scenario = this.scenarioService.findScenarioById(payload.id);

    if (!scenario) {
      throw new NotFoundException('Scenario not found');
    }

    if (scenario.name !== payload.confirmName.trim()) {
      throw new BadRequestException('Scenario name confirmation does not match');
    }

    this.scenarioService.removeScenario(payload.id);
    return { id: payload.id };
  }

  @Patch()
  cloneScenario(@Body() payload: CloneScenarioPayload) {
    if (!payload.sourceId?.trim()) {
      throw new BadRequestException('sourceId is required');
    }

    const cloned = this.scenarioService.cloneScenario(payload.sourceId);

    if (!cloned) {
      throw new NotFoundException('Source scenario not found');
    }

    return cloned;
  }
}
