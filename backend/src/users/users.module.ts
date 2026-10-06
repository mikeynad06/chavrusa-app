import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AccountDeletionService } from './account-deletion.service';

@Module({
  controllers: [UsersController], // <-- This is required to map the routes!
  providers: [UsersService, AccountDeletionService],
})
export class UsersModule {}