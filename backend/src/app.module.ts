import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter'; // <-- 1. Added this!
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { RequestsModule } from './requests/requests.module';
import { MatchesModule } from './matches/matches.module'; 
import { NotificationsModule } from './notifications/notifications.module';
import { AuthModule } from './auth/auth.module';
import { StatsModule } from './stats/stats.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(), // <-- 2. Added this! (Initializes the event system)
    PrismaModule,
    UsersModule,
    RequestsModule,
    MatchesModule,
    NotificationsModule, AuthModule,
    StatsModule,
    ChatModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}