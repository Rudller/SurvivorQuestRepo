import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StationModule } from '../station/station.module';
import { ScenarioController } from './scenario.controller';
import { ScenarioService } from './scenario.service';

@Module({
  imports: [AuthModule, StationModule],
  controllers: [ScenarioController],
  providers: [ScenarioService],
  exports: [ScenarioService],
})
export class ScenarioModule {}
