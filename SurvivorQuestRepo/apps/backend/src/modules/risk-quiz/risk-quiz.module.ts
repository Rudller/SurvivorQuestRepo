import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TeamPhotoUploadMiddleware } from '../mobile/domain/team-photo-upload.middleware';
import { StationModule } from '../station/station.module';
import { RiskQuizController } from './risk-quiz.controller';
import { RiskQuizService } from './risk-quiz.service';

@Module({
  imports: [AuthModule, StationModule],
  controllers: [RiskQuizController],
  providers: [RiskQuizService],
  exports: [RiskQuizService],
})
export class RiskQuizModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TeamPhotoUploadMiddleware)
      .forRoutes(
        { path: 'mobile/risk-quiz/photo', method: RequestMethod.POST },
        { path: 'api/mobile/risk-quiz/photo', method: RequestMethod.POST },
      );
  }
}
