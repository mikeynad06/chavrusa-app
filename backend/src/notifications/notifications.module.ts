import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaModule } from '../prisma/prisma.module'; // <-- Add this

@Module({
  imports: [PrismaModule], // <-- And this
  providers: [NotificationsService],
})
export class NotificationsModule {}