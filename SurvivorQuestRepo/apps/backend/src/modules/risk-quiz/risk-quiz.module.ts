import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RiskQuizController } from './risk-quiz.controller';
import { RiskQuizService } from './risk-quiz.service';

@Module({
  imports: [AuthModule],
  controllers: [RiskQuizController],
  providers: [RiskQuizService],
})
export class RiskQuizModule {}
