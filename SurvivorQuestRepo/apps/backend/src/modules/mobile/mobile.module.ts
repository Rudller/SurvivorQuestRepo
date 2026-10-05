import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealizationModule } from '../realization/realization.module';
import { StationModule } from '../station/station.module';
import { TeamPhotoUploadMiddleware } from './domain/team-photo-upload.middleware';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

@Module({
  imports: [AuthModule, RealizationModule, StationModule],
  controllers: [MobileController],
  providers: [MobileService],
})
export class MobileModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TeamPhotoUploadMiddleware).forRoutes(
      ...['mobile', 'api/mobile'].flatMap((prefix) => [
        { path: `${prefix}/team/selfie`, method: RequestMethod.POST },
        { path: `${prefix}/task/photo`, method: RequestMethod.POST },
      ]),
    );
  }
}
