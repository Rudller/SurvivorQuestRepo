import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { RealizationModule } from './modules/realization/realization.module';
import { ScenarioModule } from './modules/scenario/scenario.module';
import { StationModule } from './modules/station/station.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 60_000, limit: 120 },
        { name: 'long', ttl: 15 * 60_000, limit: 1_000 },
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
