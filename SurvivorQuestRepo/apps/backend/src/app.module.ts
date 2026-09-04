import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  VENUE_IP_THROTTLE,
  mobileAwareTracker,
} from './common/security/throttle.constants';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { RealizationModule } from './modules/realization/realization.module';
import { RiskQuizModule } from './modules/risk-quiz/risk-quiz.module';
import { ScenarioModule } from './modules/scenario/scenario.module';
import { StationModule } from './modules/station/station.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        // Keyed per device on mobile paths, per IP everywhere else. Left on the
        // address these were one shared budget for a whole venue: 120 requests
        // a minute split between fifteen tablets is eight each, which onboarding
        // alone blows through in seconds.
        {
          name: 'short',
          ttl: 60_000,
          limit: 120,
          getTracker: mobileAwareTracker,
        },
        {
          name: 'long',
          ttl: 15 * 60_000,
          limit: 1_000,
          getTracker: mobileAwareTracker,
        },
        // Never named by a @Throttle decorator, so it applies to every route as
        // the per-address ceiling the per-device buckets no longer provide.
        VENUE_IP_THROTTLE,
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ChatModule,
    StationModule,
    ScenarioModule,
    RealizationModule,
    MobileModule,
    GalleryModule,
    RiskQuizModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
