import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter'; // <-- 1. Added this!
import { ThrottlerModule } from '@nestjs/throttler';
import { rateLimitMessage } from './auth/rate-limits';
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
    // In-memory rate limit counters. Only routes with @UseGuards(ThrottlerGuard) are limited
    // (the auth routes); limits are set per route with @Throttle, this is just the fallback.
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 10 }], errorMessage: rateLimitMessage }),
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