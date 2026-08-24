import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StationModule } from '../station/station.module';
import { RiskQuizController } from './risk-quiz.controller';
import { RiskQuizService } from './risk-quiz.service';

@Module({
  imports: [AuthModule, StationModule],
  controllers: [RiskQuizController],
  providers: [RiskQuizService],
  exports: [RiskQuizService],
})
export class RiskQuizModule {}
