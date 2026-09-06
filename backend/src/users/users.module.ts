import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController], // <-- This is required to map the routes!
  providers: [UsersService],
})
export class UsersModule {}