import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ScenarioModule } from '../scenario/scenario.module';
import { StationModule } from '../station/station.module';
import { RealizationController } from './realization.controller';
import { RealizationService } from './realization.service';

@Module({
  imports: [AuthModule, ScenarioModule, StationModule],
  controllers: [RealizationController],
  providers: [RealizationService],
  exports: [RealizationService],
})
export class RealizationModule {}
