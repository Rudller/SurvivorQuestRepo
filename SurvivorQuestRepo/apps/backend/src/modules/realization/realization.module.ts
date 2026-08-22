import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RiskQuizModule } from '../risk-quiz/risk-quiz.module';
import { ScenarioModule } from '../scenario/scenario.module';
import { StationModule } from '../station/station.module';
import { TranslationModule } from '../translation/translation.module';
import { RealizationController } from './realization.controller';
import { RealizationService } from './realization.service';

@Module({
  imports: [
    AuthModule,
    ScenarioModule,
    StationModule,
    TranslationModule,
    RiskQuizModule,
  ],
  controllers: [RealizationController],
  providers: [RealizationService],
  exports: [RealizationService],
})
export class RealizationModule {}
