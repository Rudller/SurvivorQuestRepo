import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { RealizationModule } from './modules/realization/realization.module';
import { ScenarioModule } from './modules/scenario/scenario.module';
import { StationModule } from './modules/station/station.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ChatModule,
    StationModule,
    ScenarioModule,
    RealizationModule,
    MobileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
