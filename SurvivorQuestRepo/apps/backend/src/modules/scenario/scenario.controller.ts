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
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedSessionGuard } from '../auth/guards/authenticated-session.guard';
import { AdminOnly } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StationService } from '../station/station.service';
import {
  parseCloneScenarioDto,
  parseCreateScenarioDto,
  parseDeleteScenarioDto,
  parseUpdateScenarioDto,
  toCreateScenarioEntity,
  toUpdatedScenarioEntity,
} from './dto/scenario.dto';
import { ScenarioService } from './scenario.service';

@Controller('scenario')
@AdminOnly()
@UseGuards(AuthenticatedSessionGuard, RolesGuard)
export class ScenarioController {
  constructor(
    private readonly scenarioService: ScenarioService,
    private readonly stationService: StationService,
  ) {}

  @Get()
  async getScenarios() {
    return this.scenarioService.listScenarios();
  }

  @Post()
  async createScenario(@Body() payload: unknown) {
    const dto = parseCreateScenarioDto(payload);

    if (
      (await this.stationService.findStationsByIds(dto.stationIds)).length !==
      dto.stationIds.length
    ) {
      throw new BadRequestException('Invalid station ids');
    }

    return this.scenarioService.addScenario(toCreateScenarioEntity(dto));
  }

  @Put()
  async updateScenario(@Body() payload: unknown) {
    const dto = parseUpdateScenarioDto(payload);

    if (
      (await this.stationService.findStationsByIds(dto.stationIds)).length !==
      dto.stationIds.length
    ) {
      throw new BadRequestException('Invalid station ids');
    }

    const currentScenario = await this.scenarioService.findScenarioById(dto.id);

    if (!currentScenario) {
      throw new NotFoundException('Scenario not found');
    }

    return this.scenarioService.replaceScenario(
      toUpdatedScenarioEntity(currentScenario, dto),
    );
  }

  @Delete()
  async deleteScenario(@Body() payload: unknown) {
    const dto = parseDeleteScenarioDto(payload);

    const scenario = await this.scenarioService.findScenarioById(dto.id);

    if (!scenario) {
      throw new NotFoundException('Scenario not found');
    }

    if (scenario.name !== dto.confirmName) {
      throw new BadRequestException(
        'Scenario name confirmation does not match',
      );
    }

    await this.scenarioService.removeScenario(dto.id);
    return { id: dto.id };
  }

  @Patch()
  async cloneScenario(@Body() payload: unknown) {
    const dto = parseCloneScenarioDto(payload);

    const cloned = await this.scenarioService.cloneScenario(dto.sourceId);

    if (!cloned) {
      throw new NotFoundException('Source scenario not found');
    }

    return cloned;
  }
}
