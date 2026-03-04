import { Module } from '@nestjs/common';
import { ScenarioModule } from '../scenario/scenario.module';
import { StationModule } from '../station/station.module';
import { RealizationController } from './realization.controller';
import { RealizationService } from './realization.service';

@Module({
  imports: [ScenarioModule, StationModule],
  controllers: [RealizationController],
  providers: [RealizationService],
  exports: [RealizationService],
})
export class RealizationModule {}
